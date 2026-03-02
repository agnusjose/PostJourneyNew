import math
import time

# ─────────────────────────────────────────────────────────────────────────────
# Turn-in-Place (180°) Balance Exercise Analyzer
#
# State machine (hold-based with direction alternation):
#   READY → TURNING → TURN_COMPLETE → PAUSE → SUCCESS → SWITCH_DIRECTION
#
# Camera: full-body front view, head → feet visible.
# ─────────────────────────────────────────────────────────────────────────────

# ---------- Constants ----------
MIN_VISIBILITY = 0.2
EMA_ALPHA = 0.35
TARGET_REPS = 5
PAUSE_DURATION = 10.0       # seconds to hold still after turn

# Turn detection
TURN_START_THRESH = 15.0    # degrees of rotation to enter TURNING
TURN_COMPLETE_MIN = 130.0   # degrees to count as a valid turn (lenient)
TURN_STABLE_TIME = 1.5      # seconds of stable angle to confirm turn done
TURN_STABLE_DELTA = 8.0     # max angle change per frame during "stable"

# Safety – very lenient for elderly
TRUNK_LEAN_MAX = 25.0       # degrees
SWAY_FAIL = 0.25            # normalised hip lateral drift for major step-out

# MediaPipe indices
NOSE = 0
L_SHOULDER = 11; R_SHOULDER = 12
L_HIP = 23;     R_HIP = 24
L_ANKLE = 27;   R_ANKLE = 28

REQUIRED_LANDMARKS = [NOSE, L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_ANKLE, R_ANKLE]

# States
READY = "READY"
TURNING = "TURNING"
TURN_COMPLETE = "TURN_COMPLETE"
PAUSE = "PAUSE"
SUCCESS = "SUCCESS"
SWITCH_DIRECTION = "SWITCH_DIRECTION"
COMPLETED = "COMPLETED"


# ---------- Geometry ----------
def _midpoint(a, b):
    return {"x": (a["x"] + b["x"]) / 2.0, "y": (a["y"] + b["y"]) / 2.0}


def _shoulder_angle(l_shoulder, r_shoulder):
    """
    Angle of the shoulder line relative to horizontal.
    Returns degrees: 0 = shoulders perfectly horizontal (facing camera),
    ±90 = turned sideways.
    """
    dx = r_shoulder["x"] - l_shoulder["x"]
    dy = r_shoulder["y"] - l_shoulder["y"]
    return math.degrees(math.atan2(dy, dx))


def _trunk_lean(shoulder_mid, hip_mid):
    """Angle of torso from vertical (0 = upright)."""
    dx = shoulder_mid["x"] - hip_mid["x"]
    dy = shoulder_mid["y"] - hip_mid["y"]
    dot = -dy
    mag = math.hypot(dx, dy)
    if mag < 1e-8:
        return 0.0
    cosine = max(-1.0, min(1.0, dot / mag))
    return math.degrees(math.acos(cosine))


def _ema(prev, sample, alpha=EMA_ALPHA):
    if prev is None or prev == 0:
        return sample
    return alpha * prev + (1 - alpha) * sample


def _angle_diff(a, b):
    """Signed shortest angular difference (a - b) in [-180, 180]."""
    d = a - b
    while d > 180:
        d -= 360
    while d < -180:
        d += 360
    return d


# ---------- Landmark helpers ----------
def _lm(landmarks, idx):
    return landmarks[idx]


def _vis(landmarks, idx):
    return landmarks[idx].get("visibility", 0.0)


def _all_visible(landmarks, indices):
    return all(_vis(landmarks, i) >= MIN_VISIBILITY for i in indices)


# ---------- Main Analyzer ----------
def analyze_turn_in_place(landmarks, state=None):
    now = time.time()
    state = state or {}

    state.setdefault("phase", READY)
    state.setdefault("reps", 0)
    state.setdefault("direction", "RIGHT")      # first turn direction
    state.setdefault("initial_angle", None)      # shoulder angle at start
    state.setdefault("smoothed_angle", None)
    state.setdefault("turn_progress", 0.0)       # 0–180
    state.setdefault("peak_turn", 0.0)
    state.setdefault("stable_start", None)
    state.setdefault("pause_start", None)
    state.setdefault("pause_elapsed", 0.0)
    state.setdefault("hip_baseline", None)
    state.setdefault("smoothed_sway", 0.0)
    state.setdefault("last_announce", -1)
    state.setdefault("switch_seen_return", False)

    def result(instruction, progress=None):
        if progress is None:
            progress = state["reps"] / TARGET_REPS
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["phase"] == COMPLETED,
            "reps": state["reps"],
            "turn_angle": round(state["turn_progress"], 0),
            "direction": state["direction"],
            "pause_time": round(state["pause_elapsed"], 1),
            "current_state": state["phase"],
            "confidence": 0.0,
        }

    # ── Completed ──
    if state["phase"] == COMPLETED:
        return result("Exercise complete!", 1.0)

    # ── Switch direction — wait for user to return near starting angle ──
    if state["phase"] == SWITCH_DIRECTION:
        if landmarks and _all_visible(landmarks, REQUIRED_LANDMARKS):
            l_sh = _lm(landmarks, L_SHOULDER)
            r_sh = _lm(landmarks, R_SHOULDER)
            raw = _shoulder_angle(l_sh, r_sh)
            state["smoothed_angle"] = _ema(state["smoothed_angle"], raw)
            diff = abs(_angle_diff(state["smoothed_angle"], state["initial_angle"]))
            if diff < 30:
                state["phase"] = READY
                state["turn_progress"] = 0.0
                state["peak_turn"] = 0.0
                state["stable_start"] = None
                state["pause_start"] = None
                state["pause_elapsed"] = 0.0
                state["last_announce"] = -1
                return result(f"Ready! Turn {state['direction'].lower()}")
        d = state["direction"].lower()
        return result(f"Face camera, then turn {d}")

    # ── No landmarks ──
    if not landmarks:
        return result("Adjust camera, full body")

    # ── Visibility ──
    if not _all_visible(landmarks, REQUIRED_LANDMARKS):
        return result("Full body must be visible")

    # ── Extract landmarks ──
    l_sh = _lm(landmarks, L_SHOULDER)
    r_sh = _lm(landmarks, R_SHOULDER)
    shoulder_mid = _midpoint(l_sh, r_sh)
    hip_mid = _midpoint(_lm(landmarks, L_HIP), _lm(landmarks, R_HIP))

    # ── Shoulder rotation ──
    raw_angle = _shoulder_angle(l_sh, r_sh)
    if state["smoothed_angle"] is None:
        state["smoothed_angle"] = raw_angle
    else:
        state["smoothed_angle"] = _ema(state["smoothed_angle"], raw_angle)

    # ── Confidence ──
    vis_sum = sum(_vis(landmarks, i) for i in REQUIRED_LANDMARKS)
    confidence = vis_sum / len(REQUIRED_LANDMARKS)

    def result_c(instruction, progress=None):
        r = result(instruction, progress)
        r["confidence"] = round(confidence, 2)
        return r

    # ── Trunk lean ──
    lean = _trunk_lean(shoulder_mid, hip_mid)

    # ── Sway ──
    if state["hip_baseline"] is None:
        state["hip_baseline"] = hip_mid
    lateral = abs(hip_mid["x"] - state["hip_baseline"]["x"])
    state["smoothed_sway"] = _ema(state["smoothed_sway"], lateral)

    # ── Safety ──
    if lean > TRUNK_LEAN_MAX and state["phase"] not in (READY, COMPLETED):
        return result_c("Stand taller")

    # ── State machine ──
    phase = state["phase"]

    if phase == READY:
        # Capture initial facing angle
        if state["initial_angle"] is None:
            state["initial_angle"] = state["smoothed_angle"]
            state["hip_baseline"] = hip_mid

        diff = abs(_angle_diff(state["smoothed_angle"], state["initial_angle"]))
        if diff >= TURN_START_THRESH:
            state["phase"] = TURNING
            state["turn_progress"] = diff
            return result_c(f"Turning {state['direction'].lower()}, keep going")

        return result_c(f"Turn {state['direction'].lower()} slowly")

    if phase == TURNING:
        diff = abs(_angle_diff(state["smoothed_angle"], state["initial_angle"]))
        state["turn_progress"] = min(diff, 180.0)
        if diff > state["peak_turn"]:
            state["peak_turn"] = diff

        if diff >= TURN_COMPLETE_MIN:
            state["phase"] = TURN_COMPLETE
            state["stable_start"] = now
            return result_c("Almost there, slow down")

        return result_c("Keep turning slowly")

    if phase == TURN_COMPLETE:
        diff = abs(_angle_diff(state["smoothed_angle"], state["initial_angle"]))
        state["turn_progress"] = min(diff, 180.0)

        # Wait for rotation to stabilise
        angle_delta = abs(raw_angle - state["smoothed_angle"])
        if angle_delta > TURN_STABLE_DELTA:
            state["stable_start"] = now  # reset stability timer

        elapsed = now - (state["stable_start"] or now)
        if elapsed >= TURN_STABLE_TIME:
            state["phase"] = PAUSE
            state["pause_start"] = now
            state["hip_baseline"] = hip_mid
            state["smoothed_sway"] = 0.0
            return result_c("Good turn! Hold still 10s")

        return result_c("Stop turning, hold position")

    if phase == PAUSE:
        state["pause_elapsed"] = now - (state["pause_start"] or now)

        # Check if they moved too much during pause
        diff = abs(_angle_diff(state["smoothed_angle"], state["initial_angle"]))
        state["turn_progress"] = min(diff, 180.0)

        if state["pause_elapsed"] >= PAUSE_DURATION:
            state["reps"] += 1
            if state["reps"] >= TARGET_REPS:
                state["phase"] = COMPLETED
                return result_c("Exercise complete!", 1.0)
            # Alternate direction
            state["direction"] = "LEFT" if state["direction"] == "RIGHT" else "RIGHT"
            state["phase"] = SWITCH_DIRECTION
            state["switch_seen_return"] = False
            return result_c(f"Good! Turn {state['direction'].lower()} next")

        secs_left = int(PAUSE_DURATION - state["pause_elapsed"])
        bucket = secs_left // 3
        if bucket != state.get("last_announce", -1) and secs_left > 0:
            state["last_announce"] = bucket
            msg = f"Hold still, {secs_left}s"
            state["last_pause_msg"] = msg
            return result_c(msg)

        # Return the same message to avoid TTS re-triggering
        return result_c(state.get("last_pause_msg", "Holding"))

    return result_c("Stand facing the camera")
