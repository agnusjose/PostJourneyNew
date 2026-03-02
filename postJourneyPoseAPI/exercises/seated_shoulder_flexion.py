import numpy as np
import time

# ---------- Constants ----------
TARGET_REPS = 10
EMA_ALPHA = 0.35

ARM_UP_THRESHOLD = 0.15     # wrists well above shoulders
ARM_DOWN_THRESHOLD = 0.02   # wrists near/below shoulders
HOLD_DURATION = 3.0         # seconds to hold at top

_MP_L_SHOULDER = 11
_MP_R_SHOULDER = 12
_MP_L_WRIST = 15
_MP_R_WRIST = 16
_MP_L_HIP = 23
_MP_R_HIP = 24

BASELINE_FRAMES = 8


# ---------- Helpers ----------
def landmarks_ok(landmarks):
    if not landmarks or len(landmarks) < 25:
        return False
    needed = [_MP_L_SHOULDER, _MP_R_SHOULDER, _MP_L_WRIST, _MP_R_WRIST]
    return all(landmarks[i]["visibility"] > 0.05 for i in needed)


def avg_y(landmarks, a, b):
    return (landmarks[a]["y"] + landmarks[b]["y"]) / 2


def single_arm_elevation(shoulder, wrist, torso):
    if torso < 0.01:
        torso = 0.15
    return (shoulder["y"] - wrist["y"]) / torso


def arm_elevations(landmarks):
    hip_y = avg_y(landmarks, _MP_L_HIP, _MP_R_HIP)
    shoulder_y = avg_y(landmarks, _MP_L_SHOULDER, _MP_R_SHOULDER)
    torso = abs(hip_y - shoulder_y)
    left = single_arm_elevation(landmarks[_MP_L_SHOULDER], landmarks[_MP_L_WRIST], torso)
    right = single_arm_elevation(landmarks[_MP_R_SHOULDER], landmarks[_MP_R_WRIST], torso)
    return left, right


# ---------- Main Analyzer ----------
def analyze_seated_shoulder_flexion(landmarks, state=None):
    """
    Seated Shoulder Flexion:
    1. Sit straight, feet flat, core engaged
    2. Raise both arms straight up toward ceiling
    3. Hold at top for a few seconds
    4. Slowly lower back down
    5. Repeat 10 times
    """
    now = time.time()
    state = state or {}

    state.setdefault("phase", "CALIBRATING")
    state.setdefault("reps", 0)
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

    if not landmarks_ok(landmarks):
        if state["phase"] not in ("CALIBRATING",):
            return result("Adjust camera — keep going")
        return result("Position yourself so your upper body is visible", 0)

    # ---------- Measure both arms ----------
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

    if phase == "CALIBRATING":
        state["baseline_samples"].append(1)
        if len(state["baseline_samples"]) >= BASELINE_FRAMES:
            state["baseline_samples"] = []
            state["phase"] = "ARMS_DOWN"
            state["phase_start"] = now
            return result("Sit straight with feet flat — slowly raise both arms toward the ceiling")
        if len(state["baseline_samples"]) == 1:
            return result("Sit up straight, feet flat on the floor, core engaged")
        return result("Getting ready…")

    if phase == "ARMS_DOWN":
        if both_up:
            state["phase"] = "ARMS_UP"
            state["phase_start"] = now
            return result("Arms up! Hold the stretch")

        if left_only:
            return result("Raise your right arm too — both arms up")
        if right_only:
            return result("Raise your left arm too — both arms up")

        return result(f"Slowly raise both arms toward the ceiling (Rep {state['reps'] + 1}/{TARGET_REPS})")

    if phase == "ARMS_UP":
        elapsed = now - (state["phase_start"] or now)

        if both_down:
            state["reps"] += 1
            if state["reps"] >= TARGET_REPS:
                state["phase"] = "COMPLETED"
                return result("Exercise complete!", 1.0)
            state["phase"] = "ARMS_DOWN"
            state["phase_start"] = now
            return result(f"Rep {state['reps']}/{TARGET_REPS} done — raise your arms again")

        if elapsed < HOLD_DURATION:
            remaining = int(HOLD_DURATION - elapsed) + 1
            return result(f"Hold the stretch ({remaining}s)")

        return result("Slowly lower your arms back down")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")