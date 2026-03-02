import math
import time

# ─────────────────────────────────────────────────────────────────────────────
# Tandem Standing (Heel-to-Toe Balance) Analyzer
#
# Hold-based state machine (NOT rep-based):
#   NOT_READY → FEET_ALIGNING → ALIGNED → HOLDING → SUCCESS → SWITCH_FEET
#
# Camera: full-body front or slight angle, head → feet visible.
# ─────────────────────────────────────────────────────────────────────────────

# ---------- Constants ----------
MIN_VISIBILITY = 0.2
EMA_ALPHA = 0.35
HOLD_TARGET = 20.0          # seconds per side

# Alignment thresholds (normalised coords)
HEEL_TOE_GAP_MAX = 0.06     # max dist between front heel ↔ back toe
FOOT_LINE_THRESH = 0.04     # lateral offset for inline check

# Posture
TRUNK_LEAN_MAX = 25.0       # degrees — very lenient for elderly

# Balance / sway — elderly tremor is normal and expected
SWAY_WARN = 0.12            # normalised hip lateral drift (gentle nudge)
SWAY_FAIL = 0.25            # only a major step-out

ALIGN_CONFIRM_TIME = 1.0    # seconds stable alignment to start hold

# MediaPipe indices (after cv2.flip)
NOSE = 0
L_SHOULDER = 11; R_SHOULDER = 12
L_HIP = 23;     R_HIP = 24
L_ANKLE = 27;   R_ANKLE = 28
L_HEEL = 29;    R_HEEL = 30
L_FOOT_INDEX = 31; R_FOOT_INDEX = 32

UPPER_LANDMARKS = [NOSE, L_SHOULDER, R_SHOULDER, L_HIP, R_HIP]
FOOT_LANDMARKS = [L_ANKLE, R_ANKLE, L_HEEL, R_HEEL, L_FOOT_INDEX, R_FOOT_INDEX]

# States
NOT_READY = "NOT_READY"
FEET_ALIGNING = "FEET_ALIGNING"
ALIGNED = "ALIGNED"
HOLDING = "HOLDING"
SUCCESS = "SUCCESS"
SWITCH_FEET = "SWITCH_FEET"
COMPLETED = "COMPLETED"


# ---------- Geometry ----------
def _midpoint(a, b):
    return {"x": (a["x"] + b["x"]) / 2.0, "y": (a["y"] + b["y"]) / 2.0}


def _dist(a, b):
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


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


# ---------- Landmark helpers ----------
def _lm(landmarks, idx):
    if isinstance(landmarks, list):
        return landmarks[idx]
    return landmarks[idx]


def _vis(landmarks, idx):
    if isinstance(landmarks, list):
        return landmarks[idx].get("visibility", 0.0)
    return landmarks.get(idx, {}).get("visibility", 0.0)


def _check_visible(landmarks, indices, threshold=MIN_VISIBILITY):
    return all(_vis(landmarks, i) >= threshold for i in indices)


# ---------- Main Analyzer ----------
def analyze_tandem_standing(landmarks, state=None):
    now = time.time()
    state = state or {}

    state.setdefault("phase", NOT_READY)
    state.setdefault("align_start", None)
    state.setdefault("hold_start", None)
    state.setdefault("hold_elapsed", 0.0)
    state.setdefault("stance", None)        # "LEFT_FORWARD" or "RIGHT_FORWARD"
    state.setdefault("prev_stance", None)    # stance from first side
    state.setdefault("sides_done", 0)
    state.setdefault("hip_baseline", None)
    state.setdefault("smoothed_sway", 0.0)
    state.setdefault("smoothed_lean", 0.0)
    state.setdefault("last_announce", -1)    # last 5s bucket announced

    def result(instruction, progress=None):
        if progress is None:
            progress = 0.0
            if state["sides_done"] >= 2:
                progress = 1.0
            elif state["sides_done"] == 1:
                progress = 0.5 + (state["hold_elapsed"] / HOLD_TARGET) * 0.5
            else:
                progress = (state["hold_elapsed"] / HOLD_TARGET) * 0.5
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["phase"] == COMPLETED,
            "reps": state["sides_done"],
            "hold_time": round(state["hold_elapsed"], 1),
            "stance": state["stance"],
            "sway": round(state["smoothed_sway"], 3),
            "trunk_lean": round(state["smoothed_lean"], 1),
            "current_state": state["phase"],
            "confidence": 0.0,
        }

    # ── Completed ──
    if state["phase"] == COMPLETED:
        return result("Exercise complete!", 1.0)

    # ── Switch feet — require separation, then front heel in new position ──
    if state["phase"] == SWITCH_FEET:
        if landmarks:
            l_heel = _lm(landmarks, L_HEEL)
            r_heel = _lm(landmarks, R_HEEL)
            l_toe = _lm(landmarks, L_FOOT_INDEX)
            r_toe = _lm(landmarks, R_FOOT_INDEX)
            gap_lr = _dist(l_heel, r_toe)
            gap_rl = _dist(r_heel, l_toe)

            any_aligned = (gap_lr < HEEL_TOE_GAP_MAX or gap_rl < HEEL_TOE_GAP_MAX)

            # Step 1: feet must break tandem alignment first
            if not state.get("feet_separated", False):
                if not any_aligned:
                    state["feet_separated"] = True
                    return result("Good, now place other foot forward")
                return result("Step apart, then switch")

            # Step 2: detect alignment with front heel in a NEW position
            if any_aligned:
                # Figure out which heel is the "front" one (closer to the other toe)
                if gap_lr < gap_rl:
                    front_heel = {"x": l_heel["x"], "y": l_heel["y"]}
                else:
                    front_heel = {"x": r_heel["x"], "y": r_heel["y"]}

                prev_heel = state.get("prev_front_heel")
                if prev_heel:
                    shift = _dist(front_heel, prev_heel)
                    if shift < 0.04:
                        # Front heel is in the same spot — same foot forward
                        return result("Other foot forward please")

                # Front heel has moved enough — accept
                state["phase"] = ALIGNED
                state["hold_elapsed"] = 0.0
                state["hold_start"] = None
                state["align_start"] = now
                state["hip_baseline"] = _midpoint(
                    _lm(landmarks, L_HIP), _lm(landmarks, R_HIP)
                )
                state["smoothed_sway"] = 0.0
                state["last_announce"] = -1
                state["feet_separated"] = False
                return result("Good, hold this position")

        return result("Switch feet and repeat")

    # ── No landmarks ──
    if not landmarks:
        _reset_alignment(state)
        return result("Adjust camera, full body")

    # ── Visibility ──
    upper_ok = _check_visible(landmarks, UPPER_LANDMARKS)
    feet_ok = _check_visible(landmarks, FOOT_LANDMARKS, 0.15)
    if not upper_ok or not feet_ok:
        _reset_alignment(state)
        return result("Full body must be visible")

    # ── Extract key points ──
    l_heel = _lm(landmarks, L_HEEL)
    r_heel = _lm(landmarks, R_HEEL)
    l_toe = _lm(landmarks, L_FOOT_INDEX)
    r_toe = _lm(landmarks, R_FOOT_INDEX)
    shoulder_mid = _midpoint(_lm(landmarks, L_SHOULDER), _lm(landmarks, R_SHOULDER))
    hip_mid = _midpoint(_lm(landmarks, L_HIP), _lm(landmarks, R_HIP))

    # ── Trunk lean ──
    raw_lean = _trunk_lean(shoulder_mid, hip_mid)
    state["smoothed_lean"] = _ema(state["smoothed_lean"], raw_lean)
    lean = state["smoothed_lean"]

    # ── Sway (lateral hip drift) ──
    if state["hip_baseline"] is None:
        state["hip_baseline"] = hip_mid
    lateral_drift = abs(hip_mid["x"] - state["hip_baseline"]["x"])
    state["smoothed_sway"] = _ema(state["smoothed_sway"], lateral_drift)
    sway = state["smoothed_sway"]

    # ── Confidence ──
    vis_sum = sum(_vis(landmarks, i) for i in UPPER_LANDMARKS + FOOT_LANDMARKS)
    confidence = vis_sum / len(UPPER_LANDMARKS + FOOT_LANDMARKS)

    def result_c(instruction, progress=None):
        r = result(instruction, progress)
        r["confidence"] = round(confidence, 2)
        return r

    # ── Detect tandem alignment ──
    # Check both orientations: left heel → right toe, right heel → left toe
    gap_lr = _dist(l_heel, r_toe)  # left foot forward
    gap_rl = _dist(r_heel, l_toe)  # right foot forward

    is_aligned = False
    detected_stance = state["stance"]

    if gap_lr < HEEL_TOE_GAP_MAX:
        is_aligned = True
        detected_stance = "LEFT_FORWARD"
    elif gap_rl < HEEL_TOE_GAP_MAX:
        is_aligned = True
        detected_stance = "RIGHT_FORWARD"

    # ── Safety checks during hold ──
    if state["phase"] in (ALIGNED, HOLDING):
        if sway > SWAY_FAIL:
            # Reset baseline but keep timer — don't start over
            state["hip_baseline"] = hip_mid
            state["smoothed_sway"] = 0.0
            return result_c("Steady yourself")

        if lean > TRUNK_LEAN_MAX:
            return result_c("Stand taller")

        if not is_aligned:
            _reset_alignment(state)
            return result_c("Feet misaligned, try again")

        if sway > SWAY_WARN:
            # Just reset baseline, don't nag
            state["hip_baseline"] = hip_mid
            state["smoothed_sway"] = 0.0

    # ── State machine ──
    phase = state["phase"]

    if phase == NOT_READY:
        state["phase"] = FEET_ALIGNING
        return result_c("Place feet heel to toe")

    if phase == FEET_ALIGNING:
        if is_aligned:
            state["stance"] = detected_stance
            state["phase"] = ALIGNED
            state["align_start"] = now
            state["hip_baseline"] = hip_mid
            return result_c("Good alignment, hold still")
        return result_c("Heel to toe, inline")

    if phase == ALIGNED:
        if not is_aligned:
            state["phase"] = FEET_ALIGNING
            state["align_start"] = None
            return result_c("Realign your feet")

        elapsed = now - (state["align_start"] or now)
        if elapsed >= ALIGN_CONFIRM_TIME:
            state["phase"] = HOLDING
            state["hold_start"] = now
            return result_c("Holding, stay steady")

        return result_c("Confirming alignment")

    if phase == HOLDING:
        state["hold_elapsed"] = now - (state["hold_start"] or now)



        if state["hold_elapsed"] >= HOLD_TARGET:
            state["sides_done"] += 1
            if state["sides_done"] >= 2:
                state["phase"] = COMPLETED
                return result_c("Exercise complete!", 1.0)
            else:
                # Save the physical position of the front heel for swap detection
                if gap_lr < gap_rl:
                    state["prev_front_heel"] = {"x": l_heel["x"], "y": l_heel["y"]}
                else:
                    state["prev_front_heel"] = {"x": r_heel["x"], "y": r_heel["y"]}
                state["prev_stance"] = state["stance"]
                state["phase"] = SWITCH_FEET
                return result_c("Great! Switch feet now")

        secs_left = int(HOLD_TARGET - state["hold_elapsed"])
        # Only announce at 5-second intervals to avoid TTS spam
        bucket = secs_left // 5
        if bucket != state.get("last_announce", -1) and secs_left > 0:
            state["last_announce"] = bucket
            msg = f"{secs_left} seconds left"
            state["last_hold_msg"] = msg
            return result_c(msg)

        # Return the same message to avoid TTS re-triggering
        return result_c(state.get("last_hold_msg", "Holding"))

    return result_c("Stand in tandem stance")


def _reset_alignment(state):
    """Reset alignment/hold without losing side count."""
    state["phase"] = FEET_ALIGNING if state["phase"] != NOT_READY else NOT_READY
    state["align_start"] = None
    state["hold_start"] = None
    state["hold_elapsed"] = 0.0
    state["hip_baseline"] = None
    state["smoothed_sway"] = 0.0
