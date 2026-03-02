import numpy as np
import time

# ---------- Geometry ----------
def calculate_angle(a, b, c):
    """Angle at point b formed by points a-b-c, in degrees."""
    a = np.array([a["x"], a["y"]])
    b_pt = np.array([b["x"], b["y"]])
    c = np.array([c["x"], c["y"]])

    ba = a - b_pt
    bc = c - b_pt

    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    return float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0))))

def vertical_angle(upper, lower):
    """Angle of the segment (upper→lower) relative to vertical axis."""
    dx = lower["x"] - upper["x"]
    dy = lower["y"] - upper["y"]
    return float(abs(np.degrees(np.arctan2(dx, dy))))

# ---------- Constants ----------
SITTING_KNEE_ANGLE = 110      # knee angle when sitting (bent) usually ~90-110
EXTENDED_KNEE_ANGLE = 160     # knee angle when fully extended (straight)
EXTENDING_THRESHOLD = 130     # knee angle to detect transition
LOWERING_THRESHOLD = 145      # knee angle to detect lowering
TARGET_REPS = 5               # target repetitions per leg or total
HOLD_EXTENDED_TIME = 2.0      # seconds to hold extended position
MIN_VISIBILITY = 0.3          # minimum landmark visibility
STABILIZE_TIME = 1.5          # seconds the user must hold seated position before exercise starts
KNEE_SMOOTHING_ALPHA = 0.55   # EMA smoothing factor (higher = more smoothing)

# ---------- Landmark Helpers ----------
def landmarks_visible(landmarks, indices):
    """Check if all specified landmarks are sufficiently visible."""
    for i in indices:
        if landmarks[i]["visibility"] < MIN_VISIBILITY:
            return False
    return True

# Required for Seated Knee Extension: Hips, Knees, Ankles
REQUIRED_LANDMARKS = [23, 24, 25, 26, 27, 28]

def analyze_seated_knee_extension(landmarks, state=None):
    """
    Seated Knee Extension exercise analyzer.
    """
    now = time.time()
    state = state or {}

    state.setdefault("phase", "WAITING")
    state.setdefault("reps", 0)
    state.setdefault("hold_start", None)
    state.setdefault("active_leg", None) # 'left' or 'right'
    state.setdefault("stabilize_start", None)
    state.setdefault("smoothed_knee_l", None)
    state.setdefault("smoothed_knee_r", None)

    def result(instruction, progress=None):
        if progress is None:
            progress = state["reps"] / TARGET_REPS
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["reps"] >= TARGET_REPS,
            "reps": state["reps"],
        }

    if state.get("phase") == "COMPLETED":
        return result("Exercise complete!", 1.0)
        
    if not landmarks:
        state["hold_start"] = None
        state["stabilize_start"] = None
        return result("Position yourself in front of the camera", 0)

    if not landmarks_visible(landmarks, REQUIRED_LANDMARKS):
        state["hold_start"] = None
        state["stabilize_start"] = None
        return result("Make sure your legs are fully visible", 0)

    # Raw knee angles
    raw_knee_l = calculate_angle(landmarks[23], landmarks[25], landmarks[27])
    raw_knee_r = calculate_angle(landmarks[24], landmarks[26], landmarks[28])

    # Smoothed knee angles (EMA filter to reduce jitter)
    prev_l = state["smoothed_knee_l"]
    prev_r = state["smoothed_knee_r"]
    if prev_l is None:
        knee_angle_l = raw_knee_l
        knee_angle_r = raw_knee_r
    else:
        knee_angle_l = KNEE_SMOOTHING_ALPHA * prev_l + (1 - KNEE_SMOOTHING_ALPHA) * raw_knee_l
        knee_angle_r = KNEE_SMOOTHING_ALPHA * prev_r + (1 - KNEE_SMOOTHING_ALPHA) * raw_knee_r
    state["smoothed_knee_l"] = knee_angle_l
    state["smoothed_knee_r"] = knee_angle_r

    while True:
        phase = state["phase"]

        if phase == "WAITING":
            if knee_angle_l < SITTING_KNEE_ANGLE or knee_angle_r < SITTING_KNEE_ANGLE:
                state["phase"] = "STABILIZING"
                state["stabilize_start"] = now
                continue
            return result("Sit flat on a chair with knees bent")

        if phase == "STABILIZING":
            # User must hold the seated position for STABILIZE_TIME
            # before we consider them ready to begin the exercise
            both_bent = knee_angle_l < SITTING_KNEE_ANGLE or knee_angle_r < SITTING_KNEE_ANGLE
            if not both_bent:
                # Knees straightened again (still adjusting / not seated yet)
                state["phase"] = "WAITING"
                state["stabilize_start"] = None
                continue
            elapsed = now - (state["stabilize_start"] or now)
            if elapsed >= STABILIZE_TIME:
                state["phase"] = "READY"
                state["stabilize_start"] = None
                continue
            return result("Getting ready… hold still")

        if phase == "READY":
            if knee_angle_l > EXTENDING_THRESHOLD:
                state["active_leg"] = "left"
                state["phase"] = "EXTENDING"
                continue
            elif knee_angle_r > EXTENDING_THRESHOLD:
                state["active_leg"] = "right"
                state["phase"] = "EXTENDING"
                continue

            return result("Straighten one knee fully")

        active_knee_angle = knee_angle_l if state["active_leg"] == "left" else knee_angle_r
        inactive_knee_angle = knee_angle_r if state["active_leg"] == "left" else knee_angle_l

        if phase == "EXTENDING":
            if active_knee_angle > EXTENDED_KNEE_ANGLE:
                state["phase"] = "HOLD"
                state["hold_start"] = now
                continue
            if active_knee_angle < SITTING_KNEE_ANGLE:
                state["phase"] = "READY"
                continue

            return result("Keep straightening your knee")

        if phase == "HOLD":
            if active_knee_angle < LOWERING_THRESHOLD:
                state["phase"] = "LOWERING"
                state["hold_start"] = None
                continue

            if state["hold_start"] is None:
                state["hold_start"] = now
            
            elapsed = now - state["hold_start"]
            if elapsed < HOLD_EXTENDED_TIME:
                return result("Hold briefly at the top")
            else:
                return result("Lower slowly back down")

        if phase == "LOWERING":
            if active_knee_angle < SITTING_KNEE_ANGLE:
                state["reps"] += 1
                state["hold_start"] = None
                
                if state["reps"] >= TARGET_REPS:
                    state["phase"] = "COMPLETED"
                    return result("Exercise complete!", 1.0)
                else:
                    state["phase"] = "READY"
                continue

            if active_knee_angle > EXTENDED_KNEE_ANGLE:
                state["phase"] = "HOLD"
                state["hold_start"] = now
                continue

            return result("Lower slowly back down")

        return result("Position yourself in front of the camera")
