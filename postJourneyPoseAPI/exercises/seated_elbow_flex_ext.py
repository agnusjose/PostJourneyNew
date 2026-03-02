import numpy as np
import time

# ---------- Geometry ----------
def calculate_angle(a, b, c):
    """Angle at point b formed by a-b-c, in degrees."""
    ba = np.array([a["x"] - b["x"], a["y"] - b["y"]])
    bc = np.array([c["x"] - b["x"], c["y"] - b["y"]])
    dot = np.dot(ba, bc)
    mag = np.linalg.norm(ba) * np.linalg.norm(bc)
    if mag < 1e-8:
        return 0.0
    cos_angle = np.clip(dot / mag, -1.0, 1.0)
    return float(np.degrees(np.arccos(cos_angle)))


# ---------- Constants ----------
TARGET_REPS = 15
EMA_ALPHA = 0.35

# Elbow angle thresholds (shoulder-elbow-wrist angle)
# Extended (straight arm) ≈ 150-170°
# Flexed (bent arm) ≈ 40-80°
EXTENDED_ANGLE = 145        # above this = arm is straight
FLEXED_ANGLE = 90           # below this = arm is bent
BASELINE_FRAMES = 8
HOLD_DURATION = 2.0         # seconds to hold at each position

# MediaPipe landmarks (after cv2.flip)
_MP_L_SHOULDER = 11
_MP_R_SHOULDER = 12
_MP_L_ELBOW = 13
_MP_R_ELBOW = 14
_MP_L_WRIST = 15
_MP_R_WRIST = 16


# ---------- Helpers ----------
def landmarks_ok(landmarks):
    if not landmarks or len(landmarks) < 17:
        return False
    needed = [_MP_L_SHOULDER, _MP_R_SHOULDER, _MP_L_ELBOW, _MP_R_ELBOW, _MP_L_WRIST, _MP_R_WRIST]
    return all(landmarks[i]["visibility"] > 0.05 for i in needed)


def elbow_angles(landmarks):
    """Returns (left_angle, right_angle) at both elbows."""
    left = calculate_angle(
        landmarks[_MP_L_SHOULDER], landmarks[_MP_L_ELBOW], landmarks[_MP_L_WRIST]
    )
    right = calculate_angle(
        landmarks[_MP_R_SHOULDER], landmarks[_MP_R_ELBOW], landmarks[_MP_R_WRIST]
    )
    return left, right


# ---------- Main Analyzer ----------
def analyze_seated_elbow_flex_ext(landmarks, state=None):
    """
    Seated Elbow Flexion-Extension:
    1. Sit with elbow supported
    2. Extend (straighten) arm fully
    3. Flex (bend) elbow, hand toward shoulder
    4. Repeat 15 reps

    Detects via shoulder-elbow-wrist angle.
    One rep = extend (straight) then flex (bent).
    Tracks whichever arm has more motion (dominant arm).
    """
    now = time.time()
    state = state or {}

    state.setdefault("phase", "CALIBRATING")
    state.setdefault("reps", 0)
    state.setdefault("baseline_samples", [])
    state.setdefault("active_arm", None)  # "left" or "right" — auto-detected
    state.setdefault("movement_phase", "FLEXED")  # start flexed, then extend
    state.setdefault("hold_start", None)

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

    if not landmarks_ok(landmarks):
        if state["phase"] not in ("CALIBRATING",):
            return result("Adjust camera — keep going")
        return result("Position yourself so your upper body is visible", 0)

    # ---------- Measure elbow angles ----------
    raw_l, raw_r = elbow_angles(landmarks)
    prev_l = state.get("smoothed_l")
    prev_r = state.get("smoothed_r")
    angle_l = EMA_ALPHA * prev_l + (1 - EMA_ALPHA) * raw_l if prev_l is not None else raw_l
    angle_r = EMA_ALPHA * prev_r + (1 - EMA_ALPHA) * raw_r if prev_r is not None else raw_r
    state["smoothed_l"] = angle_l
    state["smoothed_r"] = angle_r

    # ---------- State machine ----------
    phase = state["phase"]

    if phase == "CALIBRATING":
        state["baseline_samples"].append((angle_l, angle_r))
        if len(state["baseline_samples"]) >= BASELINE_FRAMES:
            state["baseline_samples"] = []
            state["phase"] = "ACTIVE"
            state["movement_phase"] = "FLEXED"
            return result("Slowly straighten your arm out — extend your elbow fully")
        if len(state["baseline_samples"]) == 1:
            return result("Sit with your elbow supported, shoulder blade down and back")
        return result("Getting ready…")

    if phase == "ACTIVE":
        # Auto-detect active arm
        if state["active_arm"] is None:
            if abs(angle_l - angle_r) > 20:
                state["active_arm"] = "left" if angle_l < angle_r else "right"

        if state["active_arm"] == "left":
            angle = angle_l
        elif state["active_arm"] == "right":
            angle = angle_r
        else:
            angle = min(angle_l, angle_r)

        move = state["movement_phase"]

        if move == "FLEXED":
            # Waiting for extension
            if angle >= EXTENDED_ANGLE:
                if state["hold_start"] is None:
                    state["hold_start"] = now
                
                elapsed = now - state["hold_start"]
                if elapsed >= HOLD_DURATION:
                    state["movement_phase"] = "EXTENDED"
                    state["hold_start"] = None
                    return result("Good hold! Now slowly bend your elbow — hand toward shoulder")
                
                remaining = int(HOLD_DURATION - elapsed) + 1
                return result(f"Hold extension steady ({remaining}s)")

            state["hold_start"] = None
            if angle < FLEXED_ANGLE:
                return result(f"Straighten your arm out fully (Rep {state['reps'] + 1}/{TARGET_REPS})")
            return result("Keep straightening your arm")

        if move == "EXTENDED":
            # Waiting for flexion
            if angle <= FLEXED_ANGLE:
                if state["hold_start"] is None:
                    state["hold_start"] = now
                
                elapsed = now - state["hold_start"]
                if elapsed >= HOLD_DURATION:
                    state["reps"] += 1
                    if state["reps"] >= TARGET_REPS:
                        state["phase"] = "COMPLETED"
                        return result("Exercise complete!", 1.0)
                    state["movement_phase"] = "FLEXED"
                    state["hold_start"] = None
                    return result(f"Rep {state['reps']}/{TARGET_REPS} — now straighten your arm again")
                
                remaining = int(HOLD_DURATION - elapsed) + 1
                return result(f"Hold flexion steady ({remaining}s)")

            state["hold_start"] = None
            if angle > EXTENDED_ANGLE:
                return result("Slowly bend your elbow — bring hand toward shoulder")
            return result("Keep bending your elbow")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")