import time
import math

REPS_PER_SIDE = 6
TOTAL_REPS = REPS_PER_SIDE * 2
HOLD_DURATION = 2.0
REST_DURATION = 2.0
SWITCH_DURATION = 5.0
EMA_ALPHA = 0.30
MIN_VIS = 0.20

ABDUCT_THRESHOLD = 0.08
RETURN_THRESHOLD = 0.03

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


def get_ankle_spread(landmarks, side):
    # MIRROR: User's Right = MediaPipe's Left
    if side == "right":
        hip_idx, ankle_idx = _L_HIP, _L_ANKLE
        other_ankle_idx = _R_ANKLE
    else:
        hip_idx, ankle_idx = _R_HIP, _R_ANKLE
        other_ankle_idx = _L_ANKLE

    needed = [hip_idx, ankle_idx, other_ankle_idx]
    if not all(landmarks[i]["visibility"] > MIN_VIS for i in needed):
        return None

    active_ankle_x = landmarks[ankle_idx]["x"]
    other_ankle_x = landmarks[other_ankle_idx]["x"]
    return abs(active_ankle_x - other_ankle_x)


def which_leg_abducting(landmarks):
    hip_mid_x = 0
    count = 0
    if landmarks[_L_HIP]["visibility"] > MIN_VIS:
        hip_mid_x += landmarks[_L_HIP]["x"]
        count += 1
    if landmarks[_R_HIP]["visibility"] > MIN_VIS:
        hip_mid_x += landmarks[_R_HIP]["x"]
        count += 1
    if count == 0:
        return None
    hip_mid_x /= count

    l_dist = None
    r_dist = None
    if landmarks[_L_ANKLE]["visibility"] > MIN_VIS:
        l_dist = abs(landmarks[_L_ANKLE]["x"] - hip_mid_x)
    if landmarks[_R_ANKLE]["visibility"] > MIN_VIS:
        r_dist = abs(landmarks[_R_ANKLE]["x"] - hip_mid_x)

    if l_dist is None and r_dist is None:
        return None
    
    # MIRROR: l_dist corresponds to user's RIGHT leg, r_dist to user's LEFT
    if l_dist is not None and r_dist is not None:
        if l_dist > r_dist + 0.05:
            return "right"
        elif r_dist > l_dist + 0.05:
            return "left"
        return None
    return None


def check_torso_lean(landmarks):
    if (landmarks[_L_SHOULDER]["visibility"] > MIN_VIS and
        landmarks[_R_SHOULDER]["visibility"] > MIN_VIS):
        diff = abs(landmarks[_L_SHOULDER]["y"] - landmarks[_R_SHOULDER]["y"])
        return diff > 0.06
    return False


def analyze_standing_hip_abduction(landmarks, state=None):
    now = time.time()
    state = state or {}

    state.setdefault("phase", "SETUP")
    state.setdefault("reps", 0)
    state.setdefault("side_reps", 0)
    state.setdefault("current_side", "right")
    state.setdefault("lift_phase", None)
    state.setdefault("hold_start", None)
    state.setdefault("body_confirmed", 0)
    state.setdefault("baseline_spread", None)
    state.setdefault("baseline_samples", [])
    state.setdefault("smoothed_spread", None)
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
        return result("Stand facing the camera, hold a chair for support", 0)

    spread = get_ankle_spread(landmarks, cur)

    if spread is not None:
        prev = state["smoothed_spread"]
        s = EMA_ALPHA * prev + (1 - EMA_ALPHA) * spread if prev is not None else spread
        state["smoothed_spread"] = s
    else:
        s = state["smoothed_spread"] or 0

    phase = state["phase"]

    if phase == "SETUP":
        if spread is not None:
            state["baseline_samples"].append(spread)
        state["body_confirmed"] += 1
        if state["body_confirmed"] >= 12 and len(state["baseline_samples"]) >= 8:
            samples = state["baseline_samples"]
            state["baseline_spread"] = sum(samples) / len(samples)
            state["baseline_samples"] = []
            state["phase"] = "EXERCISING"
            state["lift_phase"] = "WAITING"
            return result(f"Starting with RIGHT leg — slowly lift it out to the side")
        return result("Stand with feet hip-width apart, hold a chair for support")

    if phase == "SWITCH_SIDES":
        elapsed = now - (state["switch_start"] or now)
        if elapsed >= SWITCH_DURATION:
            state["phase"] = "CALIBRATE"
            state["baseline_samples"] = []
            state["body_confirmed"] = 0
            state["smoothed_spread"] = None
            return result(f"Now calibrating for LEFT leg — stand still")
        remaining = int(SWITCH_DURATION - elapsed) + 1
        return result(f"Switch — now prepare your LEFT leg — {remaining}s")

    if phase == "CALIBRATE":
        if spread is not None:
            state["baseline_samples"].append(spread)
        state["body_confirmed"] += 1
        if len(state["baseline_samples"]) >= 8:
            samples = state["baseline_samples"]
            state["baseline_spread"] = sum(samples) / len(samples)
            state["baseline_samples"] = []
            state["phase"] = "EXERCISING"
            state["lift_phase"] = "WAITING"
            state["smoothed_spread"] = state["baseline_spread"]
            return result(f"Lift your LEFT leg out to the side")
        return result("Stand still — calibrating for left leg")

    if phase == "EXERCISING":
        baseline = state["baseline_spread"] or 0.1
        delta = s - baseline
        lp = state["lift_phase"]

        leaning = check_torso_lean(landmarks)
        if lp == "WAITING":
            abducting = which_leg_abducting(landmarks)
            wrong = "left" if cur == "right" else "right"
            if abducting == wrong:
                return result(f"That's your {wrong} leg — lift your {cur} leg instead")

            if delta >= ABDUCT_THRESHOLD:
                if leaning:
                    return result("Don't lean your torso — keep upright as you lift")
                state["lift_phase"] = "HOLDING"
                state["hold_start"] = now
                return result("Good lift! Hold it there")
            return result(f"Lift your {cur} leg out to the side (Rep {state['reps']+1}/{TOTAL_REPS})")

        if lp == "HOLDING":
            elapsed = now - (state["hold_start"] or now)
            if leaning:
                return result("Keep your upper body straight — don't lean")
            if delta < RETURN_THRESHOLD:
                state["lift_phase"] = "WAITING"
                state["hold_start"] = None
                return result("You lowered too early — lift again")
            if elapsed >= HOLD_DURATION:
                state["lift_phase"] = "LOWERING"
                return result("Good hold! Slowly lower your leg")
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
            return result("Lower slowly and controlled")

        if lp == "REST":
            elapsed = now - (state["hold_start"] or now)
            if elapsed >= REST_DURATION:
                state["lift_phase"] = "WAITING"
                return result(f"Lift your {cur} leg to the side (Rep {state['reps']+1}/{TOTAL_REPS})")
            return result(f"Rest — next rep in {int(REST_DURATION - elapsed) + 1}s")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")