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


# ---------- Constants ----------
# Knee angle thresholds (hip-knee-ankle angle)
START_KNEE_ANGLE = 165        # leg nearly straight (supine starting)
SLIDING_IN_THRESHOLD = 150    # begin of slide: angle drops below this
HOLD_ENTRY_ANGLE = 70         # fully flexed target
SLIDING_OUT_THRESHOLD = 100   # above this during slide-out
TARGET_REPS = 5
HOLD_TIME = 5.0               # seconds to hold flexed position
STABILIZE_TIME = 1.5          # seconds to confirm supine starting position
MIN_VISIBILITY = 0.3
KNEE_SMOOTHING_ALPHA = 0.55   # EMA smoothing factor

# Heel-lift detection: max vertical distance (normalised coords) the heel
# can move away from the ankle before we flag it
HEEL_LIFT_THRESHOLD = 0.04

# Hip stability: max vertical drift (normalised) from baseline
HIP_DRIFT_THRESHOLD = 0.06

# Required landmarks: Hips, Knees, Ankles, Heels
REQUIRED_LANDMARKS = [23, 24, 25, 26, 27, 28, 29, 30]


# ---------- Landmark Helpers ----------
def landmarks_visible(landmarks, indices):
    """Check if all specified landmarks are sufficiently visible."""
    for i in indices:
        if landmarks[i]["visibility"] < MIN_VISIBILITY:
            return False
    return True


def analyze_heel_slides(landmarks, state=None):
    """
    Heel Slide (Supine Position) exercise analyzer.

    State machine phases:
        WAITING      → waiting for body to be visible while lying down
        STABILIZING  → confirming user holds supine start position (1.5 s)
        START        → leg extended, ready for slide
        SLIDING_IN   → heel sliding toward buttocks
        HOLD         → holding flexed position (5 s countdown)
        SLIDING_OUT  → heel sliding back to start
        COMPLETED    → target reps achieved
    """
    now = time.time()
    state = state or {}

    state.setdefault("phase", "WAITING")
    state.setdefault("reps", 0)
    state.setdefault("hold_start", None)
    state.setdefault("stabilize_start", None)
    state.setdefault("active_leg", None)       # 'left' or 'right'
    state.setdefault("smoothed_knee_l", None)
    state.setdefault("smoothed_knee_r", None)
    state.setdefault("heel_lifted", False)
    state.setdefault("hip_baseline_y", None)

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
        return result("Lie down and position yourself in front of the camera", 0)

    if not landmarks_visible(landmarks, REQUIRED_LANDMARKS):
        state["hold_start"] = None
        state["stabilize_start"] = None
        return result("Make sure your full legs are visible", 0)

    # ---------- Compute smoothed knee angles ----------
    raw_knee_l = calculate_angle(landmarks[23], landmarks[25], landmarks[27])
    raw_knee_r = calculate_angle(landmarks[24], landmarks[26], landmarks[28])

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

    # ---------- Heel-lift check ----------
    def check_heel_lift(leg):
        """Return True if the heel is lifted off the surface."""
        if leg == "left":
            ankle_y = landmarks[27]["y"]
            heel_y = landmarks[29]["y"]
        else:
            ankle_y = landmarks[28]["y"]
            heel_y = landmarks[30]["y"]
        # In normalised coords, y increases downward.  Heel should be at or
        # below (>=) ankle.  If heel is significantly above (<) ankle, it's lifted.
        return (ankle_y - heel_y) > HEEL_LIFT_THRESHOLD

    # ---------- Hip stability check ----------
    hip_y = (landmarks[23]["y"] + landmarks[24]["y"]) / 2
    if state["hip_baseline_y"] is None:
        state["hip_baseline_y"] = hip_y
    hip_drifted = abs(hip_y - state["hip_baseline_y"]) > HIP_DRIFT_THRESHOLD

    # ---------- State machine ----------
    while True:
        phase = state["phase"]

        if phase == "WAITING":
            # Detect supine position: both legs roughly straight
            if knee_angle_l >= START_KNEE_ANGLE and knee_angle_r >= START_KNEE_ANGLE:
                state["phase"] = "STABILIZING"
                state["stabilize_start"] = now
                state["hip_baseline_y"] = hip_y
                continue
            return result("Lie on your back with legs straight")

        if phase == "STABILIZING":
            both_straight = knee_angle_l >= START_KNEE_ANGLE and knee_angle_r >= START_KNEE_ANGLE
            if not both_straight:
                state["phase"] = "WAITING"
                state["stabilize_start"] = None
                continue
            elapsed = now - (state["stabilize_start"] or now)
            if elapsed >= STABILIZE_TIME:
                state["phase"] = "START"
                state["stabilize_start"] = None
                continue
            return result("Getting ready… hold still")

        if phase == "START":
            state["heel_lifted"] = False
            # Detect which leg starts sliding (angle drops first)
            if knee_angle_l < SLIDING_IN_THRESHOLD:
                state["active_leg"] = "left"
                state["phase"] = "SLIDING_IN"
                continue
            elif knee_angle_r < SLIDING_IN_THRESHOLD:
                state["active_leg"] = "right"
                state["phase"] = "SLIDING_IN"
                continue
            return result("Slowly slide one heel toward your buttocks")

        # Active leg angle
        active_knee = knee_angle_l if state["active_leg"] == "left" else knee_angle_r

        # Continuous heel-lift monitoring during the active phase
        if state["active_leg"] and check_heel_lift(state["active_leg"]):
            state["heel_lifted"] = True

        if phase == "SLIDING_IN":
            if state["heel_lifted"]:
                return result("Keep your heel on the surface!")

            if hip_drifted:
                return result("Keep your hips still")

            if active_knee <= HOLD_ENTRY_ANGLE:
                state["phase"] = "HOLD"
                state["hold_start"] = now
                continue

            if active_knee >= START_KNEE_ANGLE:
                # Went back to start before reaching target — reset
                state["phase"] = "START"
                state["active_leg"] = None
                continue

            return result("Slide heel closer")

        if phase == "HOLD":
            if state["heel_lifted"]:
                return result("Keep your heel on the surface!")

            if active_knee > SLIDING_OUT_THRESHOLD:
                # Started extending before hold completed — treat as slide out
                state["phase"] = "SLIDING_OUT"
                state["hold_start"] = None
                continue

            if state["hold_start"] is None:
                state["hold_start"] = now

            elapsed = now - state["hold_start"]
            remaining = max(0.0, HOLD_TIME - elapsed)

            if elapsed < HOLD_TIME:
                sec = int(remaining) + 1 if remaining > 0 else 0
                return result(f"Hold… {sec}s" if sec > 0 else "Hold…")
            else:
                state["phase"] = "SLIDING_OUT"
                state["hold_start"] = None
                continue

        if phase == "SLIDING_OUT":
            if state["heel_lifted"]:
                return result("Keep your heel on the surface!")

            if hip_drifted:
                return result("Keep your hips still")

            if active_knee >= START_KNEE_ANGLE:
                # Rep complete — validate
                if not state["heel_lifted"]:
                    state["reps"] += 1

                state["hold_start"] = None
                state["heel_lifted"] = False
                state["active_leg"] = None

                if state["reps"] >= TARGET_REPS:
                    state["phase"] = "COMPLETED"
                    return result("Exercise complete!", 1.0)
                else:
                    state["phase"] = "START"
                continue

            if active_knee <= HOLD_ENTRY_ANGLE:
                # Went back to hold position
                state["phase"] = "HOLD"
                state["hold_start"] = now
                continue

            return result("Slide heel back to starting position")

        return result("Lie down and position yourself in front of the camera")
