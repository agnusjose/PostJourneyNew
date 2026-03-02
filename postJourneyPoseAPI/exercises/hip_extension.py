import time
import math

REPS_PER_SIDE = 6
TOTAL_REPS = REPS_PER_SIDE * 2
HOLD_DURATION = 2.0
REST_DURATION = 2.0
SWITCH_DURATION = 5.0
EMA_ALPHA = 0.30
MIN_VIS = 0.20

EXTEND_THRESHOLD = 0.04
RETURN_THRESHOLD = 0.015

_L_HIP = 23
_R_HIP = 24
_L_KNEE = 25
_R_KNEE = 26
_L_ANKLE = 27
_R_ANKLE = 28
_L_SHOULDER = 11
_R_SHOULDER = 12


def body_visible(landmarks):
    if not landmarks or len(landmarks) < 29:
        return False
    shoulder_ok = (landmarks[_L_SHOULDER]["visibility"] > MIN_VIS or
                   landmarks[_R_SHOULDER]["visibility"] > MIN_VIS)
    hip_ok = (landmarks[_L_HIP]["visibility"] > MIN_VIS or
              landmarks[_R_HIP]["visibility"] > MIN_VIS)
    return shoulder_ok and hip_ok


def get_ankle_behind(landmarks, side):
    # MIRROR: User's Right = MediaPipe's Left
    if side == "right":
        hip_idx, ankle_idx = _L_HIP, _L_ANKLE
    else:
        hip_idx, ankle_idx = _R_HIP, _R_ANKLE

    if not all(landmarks[i]["visibility"] > MIN_VIS for i in [hip_idx, ankle_idx]):
        return None

    hip_y = landmarks[hip_idx]["y"]
    ankle_y = landmarks[ankle_idx]["y"]
    hip_x = landmarks[hip_idx]["x"]
    ankle_x = landmarks[ankle_idx]["x"]

    vertical_dist = ankle_y - hip_y
    horizontal_offset = abs(ankle_x - hip_x)
    return horizontal_offset


def check_lean(landmarks):
    if (landmarks[_L_SHOULDER]["visibility"] > MIN_VIS and
        landmarks[_R_SHOULDER]["visibility"] > MIN_VIS and
        landmarks[_L_HIP]["visibility"] > MIN_VIS and
        landmarks[_R_HIP]["visibility"] > MIN_VIS):
        shoulder_mid_y = (landmarks[_L_SHOULDER]["y"] + landmarks[_R_SHOULDER]["y"]) / 2
        hip_mid_y = (landmarks[_L_HIP]["y"] + landmarks[_R_HIP]["y"]) / 2
        shoulder_mid_x = (landmarks[_L_SHOULDER]["x"] + landmarks[_R_SHOULDER]["x"]) / 2
        hip_mid_x = (landmarks[_L_HIP]["x"] + landmarks[_R_HIP]["x"]) / 2
        forward_lean = abs(shoulder_mid_x - hip_mid_x)
        return forward_lean > 0.08
    return False


def analyze_hip_extension(landmarks, state=None):
    now = time.time()
    state = state or {}

    state.setdefault("phase", "SETUP")
    state.setdefault("reps", 0)
    state.setdefault("side_reps", 0)
    state.setdefault("current_side", "right")
    state.setdefault("lift_phase", None)
    state.setdefault("hold_start", None)
    state.setdefault("body_confirmed", 0)
    state.setdefault("baseline_offset", None)
    state.setdefault("baseline_samples", [])
    state.setdefault("smoothed_offset", None)
    state.setdefault("switch_start", None)

    cur = state["current_side"]

    def result(instruction, progress=None):
        if progress is None:
            progress = state["reps"] / TOTAL_REPS
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["reps"] >= TOTAL_REPS,
            "reps": state["reps"],
        }

    if state.get("phase") == "COMPLETED":
        return result("Exercise complete!", 1.0)

    if not body_visible(landmarks):
        if state["phase"] in ("EXERCISING",):
            return result("Step into frame — I need to see your full body")
        return result("Stand facing a wall or chair for balance", 0)

    offset = get_ankle_behind(landmarks, cur)

    if offset is not None:
        prev = state["smoothed_offset"]
        s = EMA_ALPHA * prev + (1 - EMA_ALPHA) * offset if prev is not None else offset
        state["smoothed_offset"] = s
    else:
        s = state["smoothed_offset"] or 0

    phase = state["phase"]

    if phase == "SETUP":
        if offset is not None:
            state["baseline_samples"].append(offset)
        state["body_confirmed"] += 1
        if state["body_confirmed"] >= 12 and len(state["baseline_samples"]) >= 8:
            samples = state["baseline_samples"]
            state["baseline_offset"] = sum(samples) / len(samples)
            state["baseline_samples"] = []
            state["phase"] = "EXERCISING"
            state["lift_phase"] = "WAITING"
            return result(f"Starting with RIGHT leg — slowly move it straight back")
        return result("Stand upright, feet hip-width apart, hold a chair for support")

    if phase == "SWITCH_SIDES":
        elapsed = now - (state["switch_start"] or now)
        if elapsed >= SWITCH_DURATION:
            state["phase"] = "CALIBRATE"
            state["baseline_samples"] = []
            state["body_confirmed"] = 0
            state["smoothed_offset"] = None
            return result("Calibrating for LEFT leg — stand still")
        remaining = int(SWITCH_DURATION - elapsed) + 1
        return result(f"Switch — prepare your LEFT leg — {remaining}s")

    if phase == "CALIBRATE":
        if offset is not None:
            state["baseline_samples"].append(offset)
        state["body_confirmed"] += 1
        if len(state["baseline_samples"]) >= 8:
            samples = state["baseline_samples"]
            state["baseline_offset"] = sum(samples) / len(samples)
            state["baseline_samples"] = []
            state["phase"] = "EXERCISING"
            state["lift_phase"] = "WAITING"
            state["smoothed_offset"] = state["baseline_offset"]
            return result("Move your LEFT leg straight back")
        return result("Stand still — calibrating for left leg")

    if phase == "EXERCISING":
        baseline = state["baseline_offset"] or 0.05
        delta = s - baseline
        lp = state["lift_phase"]

        leaning = check_lean(landmarks)
        if lp == "WAITING":
            wrong = "left" if cur == "right" else "right"
            wrong_offset = get_ankle_behind(landmarks, wrong)
            wrong_delta = 0
            if wrong_offset is not None and baseline > 0:
                wrong_delta = wrong_offset - baseline

            if wrong_delta >= EXTEND_THRESHOLD:
                return result(f"That's your {wrong} leg — move your {cur} leg back")

            if delta >= EXTEND_THRESHOLD:
                if leaning:
                    return result("Keep your back straight — don't lean forward")
                state["lift_phase"] = "HOLDING"
                state["hold_start"] = now
                return result("Good extension! Hold it there")
            return result(f"Move your {cur} leg straight back (Rep {state['reps']+1}/{TOTAL_REPS})")

        if lp == "HOLDING":
            elapsed = now - (state["hold_start"] or now)
            if leaning:
                return result("Keep upright — don't lean forward")
            if delta < RETURN_THRESHOLD:
                state["lift_phase"] = "WAITING"
                state["hold_start"] = None
                return result("You returned too early — extend back again")
            if elapsed >= HOLD_DURATION:
                state["lift_phase"] = "LOWERING"
                return result("Good hold! Slowly bring your leg back")
            remaining = int(HOLD_DURATION - elapsed) + 1
            return result(f"Hold steady ({remaining}s)")

        if lp == "LOWERING":
            if delta < RETURN_THRESHOLD:
                state["reps"] += 1
                state["side_reps"] += 1

                if state["reps"] >= TOTAL_REPS:
                    state["phase"] = "COMPLETED"
                    return result("Exercise complete!", 1.0)

                if state["side_reps"] >= REPS_PER_SIDE and cur == "right":
                    state["current_side"] = "left"
                    state["side_reps"] = 0
                    state["phase"] = "SWITCH_SIDES"
                    state["switch_start"] = now
                    return result("Right leg done! Switch to LEFT leg")

                state["lift_phase"] = "REST"
                state["hold_start"] = now
                return result(f"Rep {state['reps']}/{TOTAL_REPS} done — rest")
            return result("Slowly bring your leg back")

        if lp == "REST":
            elapsed = now - (state["hold_start"] or now)
            if elapsed >= REST_DURATION:
                state["lift_phase"] = "WAITING"
                return result(f"Move your {cur} leg back (Rep {state['reps']+1}/{TOTAL_REPS})")
            return result(f"Rest — next rep in {int(REST_DURATION - elapsed) + 1}s")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")