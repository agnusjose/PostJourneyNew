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
    dy = lower["y"] - upper["y"]  # y increases downward in image coords
    return float(abs(np.degrees(np.arctan2(dx, dy))))


# ---------- Constants ----------
SITTING_KNEE_ANGLE = 120      # knee angle when sitting (bent)
STANDING_KNEE_ANGLE = 160     # knee angle when standing (straight)
RISING_THRESHOLD = 135        # knee angle to detect transition from sit
LOWERING_THRESHOLD = 145      # knee angle to detect start of sitting back
# Hysteresis: avoid thrashing at boundaries (use slightly stricter re-entry)
SITTING_REENTRY_ANGLE = 125   # must be this bent to go back to SITTING from RISING
STANDING_REENTRY_ANGLE = 158  # must be this straight to go back to STANDING from LOWERING
MAX_TORSO_LEAN = 40           # max forward lean in degrees
HAND_PUSH_THRESHOLD = 0.08   # wrist-to-hip y-distance threshold (using hands)
TARGET_REPS = 5               # target repetitions
HOLD_STANDING_TIME = 1.5      # seconds to hold standing position
MIN_VISIBILITY = 0.25         # minimum landmark visibility (lowered for seated poses)
KNEE_SMOOTHING_ALPHA = 0.55   # EMA: higher = more smoothing, less jitter (0.5–0.7)


# ---------- Landmark Helpers ----------
def landmarks_visible(landmarks, indices):
    """Check if all specified landmarks are sufficiently visible."""
    for i in indices:
        if landmarks[i]["visibility"] < MIN_VISIBILITY:
            return False
    return True


def avg_landmark(landmarks, idx_a, idx_b):
    """Average of two landmarks (for bilateral averaging)."""
    return {
        "x": (landmarks[idx_a]["x"] + landmarks[idx_b]["x"]) / 2,
        "y": (landmarks[idx_a]["y"] + landmarks[idx_b]["y"]) / 2,
    }


# ---------- MediaPipe Pose Indices ----------
# Shoulders: 11 (left), 12 (right)
# Hips: 23 (left), 24 (right)
# Knees: 25 (left), 26 (right)

# Require only shoulders and hips for sitting. Knees are required for angle, 
# but visibility drops significantly when seated. Check visibility on torso.
REQUIRED_LANDMARKS = [11, 12, 23, 24]


# ---------- Main Analyzer ----------
def analyze_sit_to_stand(landmarks, state=None):
    """
    Sit-to-Stand exercise analyzer.

    State machine phases:
        WAITING   → waiting for body detection in seated position
        SITTING   → user is seated, ready to begin
        RISING    → user is pushing up from chair
        STANDING  → user is fully upright (hold briefly)
        LOWERING  → user is sitting back down with control
        COMPLETED → target reps achieved

    Returns dict with: instruction, progress, state, completed, reps
    """
    now = time.time()
    state = state or {}

    # Initialize state (bounded: no lists that grow)
    state.setdefault("phase", "WAITING")
    state.setdefault("reps", 0)
    state.setdefault("hold_start", None)
    state.setdefault("last_knee_angle", None)
    state.setdefault("smoothed_knee_angle", None)

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

    # -------- No landmarks detected or visibility low --------
    if state.get("phase") == "COMPLETED":
        return result("Exercise complete!", 1.0)
        
    if not landmarks:
        # Don't reset phase — just skip this frame to avoid losing progress
        state["hold_start"] = None
        return result("Stand in front of the camera so your full body is visible", 0)

    if not landmarks_visible(landmarks, REQUIRED_LANDMARKS):
        state["hold_start"] = None
        return result("Align your full body in view", 0)

    # -------- Extract key measurements --------
    # Bilateral average for robustness
    shoulder = avg_landmark(landmarks, 11, 12)
    hip = avg_landmark(landmarks, 23, 24)
    knee_l, knee_r = landmarks[25], landmarks[26]
    ankle_l, ankle_r = landmarks[27], landmarks[28]
    wrist_l, wrist_r = landmarks[15], landmarks[16]

    # Knee angles (average of both sides)
    knee_angle_l = calculate_angle(landmarks[23], knee_l, ankle_l)
    knee_angle_r = calculate_angle(landmarks[24], knee_r, ankle_r)
    knee_angle = (knee_angle_l + knee_angle_r) / 2

    # Torso forward lean
    torso_lean = vertical_angle(shoulder, hip)

    # Hand position check — if wrists are much lower than hips, user may be pushing off
    wrist_avg_y = (wrist_l["y"] + wrist_r["y"]) / 2
    hip_avg_y = hip["y"]
    hands_pushing = wrist_avg_y > hip_avg_y + HAND_PUSH_THRESHOLD

    state["last_knee_angle"] = knee_angle
    # Smoothed knee angle reduces jitter and phase thrashing from noisy landmarks
    prev_smoothed = state["smoothed_knee_angle"]
    if prev_smoothed is None:
        smoothed_knee = knee_angle
    else:
        smoothed_knee = KNEE_SMOOTHING_ALPHA * prev_smoothed + (1 - KNEE_SMOOTHING_ALPHA) * knee_angle
    state["smoothed_knee_angle"] = smoothed_knee

    # -------- State machine (uses smoothed angle + hysteresis) --------
    while True:
        phase = state["phase"]
        form_issues = []
        if torso_lean > MAX_TORSO_LEAN:
            form_issues.append("Keep back upright")
        if hands_pushing and phase in ("RISING", "STANDING"):
            form_issues.append("Don't use hands")

        # === WAITING ===
        if phase == "WAITING":
            if smoothed_knee < SITTING_KNEE_ANGLE:
                state["phase"] = "SITTING"
                continue
            if smoothed_knee > STANDING_KNEE_ANGLE:
                return result("Please sit down on the chair to begin")
            return result("Sit fully in the chair with knees bent")

        # === SITTING ===
        if phase == "SITTING":
            if smoothed_knee > RISING_THRESHOLD:
                state["phase"] = "RISING"
                continue
            if form_issues:
                return result(form_issues[0])
            return result("Stand up.")

        # === RISING (hysteresis: re-enter SITTING only when clearly bent again) ===
        if phase == "RISING":
            if smoothed_knee > STANDING_KNEE_ANGLE:
                state["phase"] = "STANDING"
                state["hold_start"] = now
                continue
            if smoothed_knee < SITTING_REENTRY_ANGLE:
                state["phase"] = "SITTING"
                continue
            if form_issues:
                return result(form_issues[0])
            return result("Keep rising")

        # === STANDING (hold countdown for clearer feedback) ===
        if phase == "STANDING":
            if smoothed_knee < LOWERING_THRESHOLD:
                state["phase"] = "LOWERING"
                state["hold_start"] = None
                continue
            if state["hold_start"] is None:
                state["hold_start"] = now
            elapsed = now - state["hold_start"]
            remaining = max(0.0, HOLD_STANDING_TIME - elapsed)
            if elapsed < HOLD_STANDING_TIME:
                sec = int(remaining) + 1 if remaining > 0 else 0
                if form_issues:
                    return result(form_issues[0])
                return result(f"Hold ({sec}s)" if sec > 0 else "Hold")
            if form_issues:
                return result(form_issues[0])
            return result("Sit down")

        # === LOWERING (hysteresis: re-enter STANDING only when clearly straight again) ===
        if phase == "LOWERING":
            if smoothed_knee < SITTING_KNEE_ANGLE:
                state["reps"] += 1
                state["hold_start"] = None
                if state["reps"] >= TARGET_REPS:
                    state["phase"] = "COMPLETED"
                    return result("Exercise complete!", 1.0)
                state["phase"] = "SITTING"
                continue
            if smoothed_knee > STANDING_REENTRY_ANGLE:
                state["phase"] = "STANDING"
                state["hold_start"] = now
                continue
            if form_issues:
                return result(form_issues[0])
            return result("Sit down")

        # === COMPLETED ===
        if phase == "COMPLETED":
            return result("Exercise complete!", 1.0)

        return result("Position yourself in front of the camera")
