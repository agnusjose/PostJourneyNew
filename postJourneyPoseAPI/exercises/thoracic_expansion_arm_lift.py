import numpy as np
import time

# ---------- Constants ----------
TARGET_REPS = 10
EMA_ALPHA = 0.35

# Arm raise: wrist Y above shoulder Y by this fraction of torso height
ARM_UP_THRESHOLD = 0.15     # wrists well above shoulders = arms raised
ARM_DOWN_THRESHOLD = 0.02   # wrists near/below shoulders = arms down

# Timing for breathing phases
INHALE_DURATION = 4.0       # seconds
PAUSE_DURATION = 2.0        # seconds (hold at top)
EXHALE_DURATION = 5.0       # seconds

# MediaPipe landmarks (after cv2.flip)
_MP_L_SHOULDER = 11
_MP_R_SHOULDER = 12
_MP_L_WRIST = 15
_MP_R_WRIST = 16
_MP_L_HIP = 23
_MP_R_HIP = 24
_MP_NOSE = 0

BASELINE_FRAMES = 8


# ---------- Helpers ----------
def landmarks_ok(landmarks):
    """Check wrists and shoulders are detected."""
    if not landmarks or len(landmarks) < 25:
        return False
    needed = [_MP_L_SHOULDER, _MP_R_SHOULDER, _MP_L_WRIST, _MP_R_WRIST]
    return all(landmarks[i]["visibility"] > 0.05 for i in needed)


def avg_y(landmarks, a, b):
    return (landmarks[a]["y"] + landmarks[b]["y"]) / 2


def single_arm_elevation(shoulder, wrist, torso):
    """How far above its shoulder a wrist is, normalised by torso height."""
    if torso < 0.01:
        torso = 0.15
    return (shoulder["y"] - wrist["y"]) / torso


def arm_elevations(landmarks):
    """
    Returns (left_elev, right_elev) — how high each wrist is above its shoulder.
    Positive = wrist above shoulder. Normalised by torso length.
    """
    hip_y = avg_y(landmarks, _MP_L_HIP, _MP_R_HIP)
    shoulder_y = avg_y(landmarks, _MP_L_SHOULDER, _MP_R_SHOULDER)
    torso = abs(hip_y - shoulder_y)
    if torso < 0.01:
        torso = 0.15
    left = single_arm_elevation(landmarks[_MP_L_SHOULDER], landmarks[_MP_L_WRIST], torso)
    right = single_arm_elevation(landmarks[_MP_R_SHOULDER], landmarks[_MP_R_WRIST], torso)
    return left, right


# ---------- Main Analyzer ----------
def analyze_thoracic_expansion_arm_lift(landmarks, state=None):
    """
    Thoracic Expansion with Arm Lift — 5-step exercise:
    1. Stand straight, arms at sides (starting position)
    2. Inhale + raise arms laterally above head (~4-5s)
    3. Pause at top, arms overhead (~2s)
    4. Exhale + lower arms back down (~5-6s)
    5. Repeat 8-10 cycles

    Detection: wrist Y position relative to shoulder Y.
    Arms up = wrists above shoulders. Arms down = wrists at/below shoulders.
    Timed breathing cues guide the user through each phase.
    """
    now = time.time()
    state = state or {}

    state.setdefault("phase", "CALIBRATING")
    state.setdefault("reps", 0)
    state.setdefault("smoothed_elev", None)
    state.setdefault("baseline_samples", [])
    state.setdefault("phase_start", None)

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

    # If no landmarks, don't reset — just skip
    if not landmarks_ok(landmarks):
        if state["phase"] not in ("CALIBRATING",):
            return result("Adjust camera — keep going")
        return result("Position yourself so your upper body is visible", 0)

    # ---------- Measure arm elevation (both arms) ----------
    raw_l, raw_r = arm_elevations(landmarks)
    prev_l = state.get("smoothed_elev_l")
    prev_r = state.get("smoothed_elev_r")
    elev_l = EMA_ALPHA * prev_l + (1 - EMA_ALPHA) * raw_l if prev_l is not None else raw_l
    elev_r = EMA_ALPHA * prev_r + (1 - EMA_ALPHA) * raw_r if prev_r is not None else raw_r
    state["smoothed_elev_l"] = elev_l
    state["smoothed_elev_r"] = elev_r

    both_up = elev_l >= ARM_UP_THRESHOLD and elev_r >= ARM_UP_THRESHOLD
    both_down = elev_l < ARM_DOWN_THRESHOLD and elev_r < ARM_DOWN_THRESHOLD
    left_only = elev_l >= ARM_UP_THRESHOLD and elev_r < ARM_UP_THRESHOLD
    right_only = elev_r >= ARM_UP_THRESHOLD and elev_l < ARM_UP_THRESHOLD

    # ---------- State machine ----------
    phase = state["phase"]

    # === CALIBRATING ===
    if phase == "CALIBRATING":
        state["baseline_samples"].append(1)
        if len(state["baseline_samples"]) >= BASELINE_FRAMES:
            state["baseline_samples"] = []
            state["phase"] = "ARMS_DOWN"
            state["phase_start"] = now
            return result("Stand straight, arms at your sides. Breathe normally.")
        if len(state["baseline_samples"]) == 1:
            return result("Stand with feet hip-width apart, arms relaxed")
        return result("Getting ready…")

    # === ARMS DOWN — waiting for user to raise arms ===
    if phase == "ARMS_DOWN":
        if both_up:
            state["phase"] = "ARMS_UP"
            state["phase_start"] = now
            return result("Arms up! Hold position and stretch tall")

        if left_only:
            return result("Raise your right arm too — both arms overhead")
        if right_only:
            return result("Raise your left arm too — both arms overhead")

        return result(f"Raise both arms up overhead — inhale deeply (Cycle {state['reps'] + 1}/{TARGET_REPS})")

    # === ARMS UP — hold at top, then wait for descent ===
    if phase == "ARMS_UP":
        elapsed = now - (state["phase_start"] or now)

        if both_down:
            # Both arms came back down — count a rep
            state["reps"] += 1
            if state["reps"] >= TARGET_REPS:
                state["phase"] = "COMPLETED"
                return result("Exercise complete!", 1.0)
            state["phase"] = "ARMS_DOWN"
            state["phase_start"] = now
            return result(f"Cycle {state['reps']}/{TARGET_REPS} done — inhale and raise arms again")

        if elapsed < PAUSE_DURATION:
            remaining = int(PAUSE_DURATION - elapsed) + 1
            return result(f"Hold — stretch toward the sky ({remaining}s)")

        return result("Exhale slowly through your mouth and lower your arms")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")