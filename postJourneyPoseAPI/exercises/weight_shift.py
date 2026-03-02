import numpy as np
import time

# ---------- Constants ----------
TARGET_REPS = 12
EMA_ALPHA = 0.35
BASELINE_FRAMES = 10

SHIFT_THRESHOLD = 0.12
HOLD_DURATION = 2.0
COOLDOWN = 1.5  # seconds after hold before detecting next shift

# MediaPipe landmarks
_MP_L_SHOULDER = 11
_MP_R_SHOULDER = 12
_MP_L_HIP = 23
_MP_R_HIP = 24


# ---------- Helpers ----------
def upper_ok(landmarks):
    if not landmarks or len(landmarks) < 25:
        return False
    needed = [_MP_L_SHOULDER, _MP_R_SHOULDER, _MP_L_HIP, _MP_R_HIP]
    return all(landmarks[i]["visibility"] > 0.05 for i in needed)


def torso_center_x(landmarks):
    return (
        landmarks[_MP_L_SHOULDER]["x"] +
        landmarks[_MP_R_SHOULDER]["x"] +
        landmarks[_MP_L_HIP]["x"] +
        landmarks[_MP_R_HIP]["x"]
    ) / 4


def shoulder_width(landmarks):
    dx = landmarks[_MP_L_SHOULDER]["x"] - landmarks[_MP_R_SHOULDER]["x"]
    return max(abs(dx), 0.01)


# ---------- Main Analyzer ----------
def analyze_weight_shift(landmarks, state=None):
    now = time.time()
    state = state or {}

    state.setdefault("phase", "CALIBRATING")
    state.setdefault("reps", 0)
    state.setdefault("baseline_x", None)
    state.setdefault("baseline_samples", [])
    state.setdefault("smoothed_shift", 0.0)
    state.setdefault("target_side", "right")
    state.setdefault("shift_start", None)
    state.setdefault("cooldown_end", 0)

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

    # Skip bad frames — don't block exercise
    if not upper_ok(landmarks):
        if state["baseline_x"] is not None:
            return result(f"Shift your weight to your {state['target_side']} leg")
        return result("Stand so your full body is visible", 0)

    # ---------- Measure ----------
    cx = torso_center_x(landmarks)
    sw = shoulder_width(landmarks)

    if state["baseline_x"] is not None:
        raw = (cx - state["baseline_x"]) / sw
        prev = state["smoothed_shift"]
        shift = EMA_ALPHA * prev + (1 - EMA_ALPHA) * raw
        state["smoothed_shift"] = shift
    else:
        shift = 0.0

    phase = state["phase"]

    # === CALIBRATING ===
    if phase == "CALIBRATING":
        state["baseline_samples"].append(cx)
        if len(state["baseline_samples"]) >= BASELINE_FRAMES:
            samples = state["baseline_samples"]
            state["baseline_x"] = sum(samples) / len(samples)
            state["baseline_samples"] = []
            state["smoothed_shift"] = 0.0
            state["phase"] = "SHIFTING"
            state["target_side"] = "right"
            return result("Shift your weight to your right leg")
        if len(state["baseline_samples"]) == 1:
            return result("Stand with feet hip-width apart, hands on hips")
        return result("Getting ready…")

    # === SHIFTING ===
    if phase == "SHIFTING":
        target = state["target_side"]

        # Still in cooldown from previous hold
        if now < state["cooldown_end"]:
            return result(f"Get ready to shift to your {target} leg")

        # Detect shift — positive = right in mirror image
        if target == "right":
            shifted = shift > SHIFT_THRESHOLD
        else:
            shifted = shift < -SHIFT_THRESHOLD

        if shifted:
            state["phase"] = "HOLDING"
            state["shift_start"] = now
            return result(f"Good — hold on your {target} leg")

        return result(f"Shift your weight to your {target} leg")

    # === HOLDING ===
    if phase == "HOLDING":
        target = state["target_side"]
        elapsed = now - (state["shift_start"] or now)

        if elapsed >= HOLD_DURATION:
            state["reps"] += 1

            if state["reps"] >= TARGET_REPS:
                state["phase"] = "COMPLETED"
                return result("Exercise complete!", 1.0)

            next_side = "left" if target == "right" else "right"
            state["target_side"] = next_side
            state["phase"] = "SHIFTING"
            state["cooldown_end"] = now + COOLDOWN
            return result(f"Rep {state['reps']}/{TARGET_REPS} — now shift to your {next_side} leg")

        return result(f"Good — hold on your {target} leg")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")