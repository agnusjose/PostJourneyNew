import numpy as np
import time

# ---------- Constants ----------
REPS_FORWARD = 5
REPS_BACKWARD = 5
TOTAL_TARGET = REPS_FORWARD + REPS_BACKWARD
EMA_ALPHA = 0.30

# Shrug detection — more sensitive for rolling motions
SHRUG_UP_THRESHOLD = 0.08    # 8% rise from baseline = shrug detected (was 20%)
SHRUG_DOWN_THRESHOLD = 0.03  # within 3% of baseline = returned

# Only need shoulders + ears for better shrug detection
_MP_L_SHOULDER = 11
_MP_R_SHOULDER = 12
_MP_L_EAR = 7
_MP_R_EAR = 8

BASELINE_FRAMES = 10


# ---------- Helpers ----------
def shoulders_detected(landmarks):
    if not landmarks or len(landmarks) < 13:
        return False
    return (landmarks[_MP_L_SHOULDER]["visibility"] > 0.05 and
            landmarks[_MP_R_SHOULDER]["visibility"] > 0.05)


def shoulder_ear_distance(landmarks):
    """
    Average distance between shoulders and ears (Y only).
    When shrugging UP: shoulders move UP (lower Y), ears stay → distance DECREASES.
    Normalised by initial baseline distance.
    """
    l_dist = abs(landmarks[_MP_L_EAR]["y"] - landmarks[_MP_L_SHOULDER]["y"])
    r_dist = abs(landmarks[_MP_R_EAR]["y"] - landmarks[_MP_R_SHOULDER]["y"])
    return (l_dist + r_dist) / 2


def avg_shoulder_y(landmarks):
    return (landmarks[_MP_L_SHOULDER]["y"] + landmarks[_MP_R_SHOULDER]["y"]) / 2


# ---------- Main Analyzer ----------
def analyze_shoulder_rolls(landmarks, state=None):
    """
    Shoulder Rolls — 5 forward + 5 backward:
    Detection: track shoulder Y position. Shrug up (Y decreases) then return = 1 rep.
    Also uses shoulder-to-ear distance when ears are visible for more accuracy.
    """
    now = time.time()
    state = state or {}

    state.setdefault("phase", "CALIBRATING")
    state.setdefault("reps", 0)
    state.setdefault("direction", "forward")  # start forward
    state.setdefault("baseline_y", None)
    state.setdefault("smoothed_y", None)
    state.setdefault("was_shrugged", False)
    state.setdefault("baseline_samples", [])
    state.setdefault("shrug_start", None)

    def result(instruction, progress=None):
        if progress is None:
            progress = state["reps"] / TOTAL_TARGET
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["reps"] >= TOTAL_TARGET,
            "reps": state["reps"],
        }

    if state.get("phase") == "COMPLETED":
        return result("Exercise complete!", 1.0)

    if not shoulders_detected(landmarks):
        if state["baseline_y"] is not None:
            return result("You moved out of frame — come back so I can see your shoulders")
        return result("Position yourself so your shoulders are visible", 0)

    # ---------- Measure ----------
    raw_y = avg_shoulder_y(landmarks)
    prev = state["smoothed_y"]
    sy = EMA_ALPHA * prev + (1 - EMA_ALPHA) * raw_y if prev is not None else raw_y
    state["smoothed_y"] = sy

    # ---------- State machine ----------
    phase = state["phase"]

    if phase == "CALIBRATING":
        state["baseline_samples"].append(sy)
        if len(state["baseline_samples"]) >= BASELINE_FRAMES:
            samples = state["baseline_samples"]
            state["baseline_y"] = sum(samples) / len(samples)
            state["baseline_samples"] = []
            state["phase"] = "ROLLING"
            state["was_shrugged"] = False
            return result("Lift your shoulders up toward your ears, then roll them forward and down")
        if len(state["baseline_samples"]) == 1:
            return result("Keep your shoulders relaxed")
        return result("Getting ready…")

    if phase == "ROLLING":
        baseline = state["baseline_y"]
        if baseline is None or baseline < 0.01:
            state["phase"] = "CALIBRATING"
            state["baseline_samples"] = []
            return result("Getting ready…")

        # How much shoulder moved up (positive = shrugged)
        # In image coords, Y increases downward, so shrug UP = Y decreases
        rise = (baseline - sy) / max(baseline, 0.01)

        direction = state["direction"]
        if direction == "forward":
            reps_in_direction = state["reps"]
            target_in_direction = REPS_FORWARD
        else:
            reps_in_direction = state["reps"] - REPS_FORWARD
            target_in_direction = REPS_BACKWARD

        # Detect shrug UP
        if not state["was_shrugged"] and rise >= SHRUG_UP_THRESHOLD:
            state["was_shrugged"] = True
            state["shrug_start"] = now
            if direction == "forward":
                return result("Good lift — now roll forward, down, and back")
            else:
                return result("Good lift — now roll backward, down, and forward")

        # Detect return DOWN = one rep complete
        if state["was_shrugged"] and rise < SHRUG_DOWN_THRESHOLD:
            # Only count if shrug lasted at least 0.3 seconds (avoid noise)
            shrug_duration = now - (state["shrug_start"] or now)
            if shrug_duration >= 0.3:
                state["was_shrugged"] = False
                state["shrug_start"] = None
                state["reps"] += 1
                reps_in_direction += 1

                # Switch direction after forward set
                if direction == "forward" and reps_in_direction >= target_in_direction:
                    state["direction"] = "backward"
                    state["was_shrugged"] = False
                    return result(f"Great! {REPS_FORWARD} forward done — now roll backward")

                if state["reps"] >= TOTAL_TARGET:
                    state["phase"] = "COMPLETED"
                    return result("Exercise complete!", 1.0)

                return result(f"Rep {reps_in_direction}/{target_in_direction} — keep rolling {direction}")
            else:
                # Too quick — was noise, reset
                state["was_shrugged"] = False
                state["shrug_start"] = None

        # Ongoing guidance
        if state["was_shrugged"]:
            return result("Roll your shoulders down smoothly")

        if direction == "forward":
            return result(f"Lift shoulders up and roll forward ({reps_in_direction}/{target_in_direction})")
        else:
            return result(f"Lift shoulders up and roll backward ({reps_in_direction}/{target_in_direction})")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")