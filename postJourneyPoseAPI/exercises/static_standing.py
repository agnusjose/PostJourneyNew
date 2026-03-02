import time
import math

# ---------- Constants ----------
HOLD_TARGET = 30  # seconds per stance (single-leg = 15s per side)
REST_BETWEEN = 4  # seconds rest between stances

# Stance definitions with detailed instructions
STANCES = [
    {
        "name": "Feet Together",
        "setup": "Bring your feet together so they are touching",
        "holding": "Hold steady — feet together, spine tall",
        "hold": 30,
    },
    {
        "name": "Semi-Tandem",
        "setup": "Place the toes of one foot against the arch of the other foot",
        "holding": "Hold steady — semi-tandem stance",
        "hold": 30,
    },
    {
        "name": "Tandem Heel-to-Toe",
        "setup": "Place one foot directly in front of the other, heel touching toes",
        "holding": "Hold steady — tandem stance, heel to toe",
        "hold": 30,
    },
    {
        "name": "Single-Leg Stand",
        "setup": "Lift one leg off the ground, keep your hips level",
        "holding": "Hold steady — single leg, keep hips level",
        "hold": 20,
    },
]
TOTAL_PHASES = len(STANCES)

# MediaPipe landmarks
_L_SHOULDER = 11
_R_SHOULDER = 12
_L_HIP = 23
_R_HIP = 24
_L_ANKLE = 27
_R_ANKLE = 28
_L_HEEL = 29
_R_HEEL = 30

# Thresholds
FEET_TOGETHER_THRESH = 0.08   # max ankle X gap for "feet together"
TANDEM_X_THRESH = 0.10        # max X gap for tandem (feet roughly in line)
SINGLE_LEG_Y_THRESH = 0.08    # ankle must rise this much above other ankle


# ---------- Helpers ----------
def body_visible(landmarks):
    if not landmarks or len(landmarks) < 29:
        return False
    needed = [_L_SHOULDER, _R_SHOULDER, _L_HIP, _R_HIP, _L_ANKLE, _R_ANKLE]
    return all(landmarks[i]["visibility"] > 0.05 for i in needed)


def ankle_x_gap(landmarks):
    """Horizontal gap between ankles (normalised 0-1)."""
    return abs(landmarks[_L_ANKLE]["x"] - landmarks[_R_ANKLE]["x"])


def ankle_y_diff(landmarks):
    """Vertical difference between ankles. Positive = left ankle higher."""
    return landmarks[_R_ANKLE]["y"] - landmarks[_L_ANKLE]["y"]


def check_stance(stance_index, landmarks):
    """
    Returns (ok: bool, hint: str) for whether the user is in the correct stance.
    """
    idx = stance_index
    x_gap = ankle_x_gap(landmarks)
    y_diff = abs(ankle_y_diff(landmarks))  # how much one ankle is above the other

    if idx == 0:  # Feet Together
        if x_gap > FEET_TOGETHER_THRESH:
            return False, "Bring your feet closer together"
        return True, ""

    if idx == 1:  # Semi-Tandem
        if x_gap > TANDEM_X_THRESH:
            return False, "Bring your feet closer — toes to arch"
        return True, ""

    if idx == 2:  # Tandem Heel-to-Toe
        # One foot must be in front of the other (Y difference) AND feet in line (small X gap)
        if x_gap > TANDEM_X_THRESH:
            return False, "Bring your feet into a line — one in front of the other"
        if y_diff < 0.04:
            return False, "Step one foot in front of the other — heel to toe"
        return True, ""

    if idx == 3:  # Single-Leg Stand
        # One foot must be lifted off the ground (Y difference)
        if y_diff < 0.05:
            return False, "Lift one foot off the ground"
        return True, ""

    return True, ""


# ---------- Main Analyzer ----------
def analyze_static_standing(landmarks, state=None):
    """
    Static Standing Endurance — 4 stance holds with real detection.
    Only counts hold time when the correct stance is detected.
    """
    now = time.time()
    state = state or {}

    state.setdefault("phase", "SETUP")
    state.setdefault("stance_index", 0)
    state.setdefault("hold_accumulated", 0.0)
    state.setdefault("last_good_time", None)
    state.setdefault("rest_start", None)
    state.setdefault("body_confirmed", 0)
    state.setdefault("setup_start", None)

    completed_stances = state["stance_index"]

    def result(instruction, progress=None):
        if progress is None:
            progress = completed_stances / TOTAL_PHASES
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": completed_stances >= TOTAL_PHASES,
            "reps": completed_stances,
        }

    if state.get("phase") == "COMPLETED":
        return result("Exercise complete!", 1.0)

    detected = body_visible(landmarks)

    if not detected:
        # Pause hold timer when not visible
        state["last_good_time"] = None
        if state["phase"] in ("HOLDING", "STANCE_SETUP"):
            return result("Step back into frame — I need to see your full body")
        return result("Stand so your full body is visible", 0)

    phase = state["phase"]

    # === SETUP — confirm body visible ===
    if phase == "SETUP":
        state["body_confirmed"] += 1
        if state["body_confirmed"] >= 6:
            state["phase"] = "STANCE_SETUP"
            state["setup_start"] = now
            stance = STANCES[0]
            return result(f"Phase 1/{TOTAL_PHASES}: {stance['setup']}")
        return result("Stand tall, arms at sides, look straight ahead")

    # === STANCE_SETUP — give user time to get into position ===
    if phase == "STANCE_SETUP":
        idx = state["stance_index"]
        stance = STANCES[idx]
        elapsed = now - (state["setup_start"] or now)

        ok, hint = check_stance(idx, landmarks)

        if ok and elapsed >= 2.0:
            # User is in position — start hold timer
            state["phase"] = "HOLDING"
            state["hold_accumulated"] = 0.0
            state["last_good_time"] = now
            return result(f"{stance['holding']} — timer starting!")

        if not ok:
            state["setup_start"] = now  # reset setup timer
            return result(f"Phase {idx+1}/{TOTAL_PHASES}: {hint}")

        remaining = max(0, int(2.0 - elapsed))
        return result(f"Phase {idx+1}/{TOTAL_PHASES}: {stance['setup']} — get ready")

    # === HOLDING — only count time while stance is correct ===
    if phase == "HOLDING":
        idx = state["stance_index"]
        stance = STANCES[idx]
        hold_target = stance["hold"]

        ok, hint = check_stance(idx, landmarks)

        if ok:
            # Accumulate hold time
            if state["last_good_time"] is not None:
                state["hold_accumulated"] += now - state["last_good_time"]
            state["last_good_time"] = now
        else:
            # Stance broken — pause timer
            state["last_good_time"] = None
            held = int(state["hold_accumulated"])
            return result(f"{hint} — timer paused ({held}s/{hold_target}s)")

        held = state["hold_accumulated"]

        if held >= hold_target:
            state["stance_index"] += 1
            completed_stances = state["stance_index"]

            if completed_stances >= TOTAL_PHASES:
                state["phase"] = "COMPLETED"
                return result("All phases complete! Great balance work!", 1.0)

            state["phase"] = "REST"
            state["rest_start"] = now
            state["hold_accumulated"] = 0.0
            state["last_good_time"] = None
            return result(f"{stance['name']} done! Relax for a moment")

        remaining = int(hold_target - held)
        return result(f"{stance['holding']} ({remaining}s remaining)")

    # === REST ===
    if phase == "REST":
        elapsed = now - (state["rest_start"] or now)
        if elapsed >= REST_BETWEEN:
            idx = state["stance_index"]
            stance = STANCES[idx]
            state["phase"] = "STANCE_SETUP"
            state["setup_start"] = now
            return result(f"Phase {idx+1}/{TOTAL_PHASES}: {stance['setup']}")
        remaining = int(REST_BETWEEN - elapsed) + 1
        return result(f"Rest — next stance in {remaining}s")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")