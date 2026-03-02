import numpy as np
import math
import time

# ─────────────────────────────────────────────────────────────────────────────
# Ankle Pumps Exercise Analyzer
#
# State machine:  WAITING → NEUTRAL → DORSIFLEXION → PLANTARFLEXION → NEUTRAL
#                 Each full cycle (NEUTRAL → DORSI → PLANTAR → NEUTRAL) = 1 rep
#
# Camera should show lower legs, ankles, and feet from the side or diagonal.
# The backend applies cv2.flip(img, 1) before MediaPipe.
# ─────────────────────────────────────────────────────────────────────────────

# ---------- Constants ----------
MIN_VISIBILITY = 0.4
FOOT_MIN_VISIBILITY = 0.15  # heel & toe landmarks are often low-vis in MediaPipe
EMA_ALPHA = 0.4
TARGET_REPS = 5

# Ankle angle thresholds (angle at ankle: knee → ankle → toe)
NEUTRAL_LOW = 75.0
NEUTRAL_HIGH = 105.0
DORSIFLEXION_THRESHOLD = 70.0     # angle < this = dorsiflexion
PLANTARFLEXION_THRESHOLD = 110.0  # angle > this = plantarflexion

STABILIZE_TIME = 1.0  # seconds to confirm neutral before exercise starts

# MediaPipe landmark indices (after cv2.flip: MP left = user's RIGHT)
# We detect both legs and use the one with better visibility
L_KNEE = 25       # MP left knee → user's RIGHT
R_KNEE = 26       # MP right knee → user's LEFT
L_ANKLE = 27      # MP left ankle → user's RIGHT
R_ANKLE = 28      # MP right ankle → user's LEFT
L_HEEL = 29       # MP left heel → user's RIGHT
R_HEEL = 30       # MP right heel → user's LEFT
L_FOOT_INDEX = 31 # MP left foot index (toe) → user's RIGHT
R_FOOT_INDEX = 32 # MP right foot index (toe) → user's LEFT

# Required landmarks per leg
LEFT_LEG = [L_KNEE, L_ANKLE, L_HEEL, L_FOOT_INDEX]
RIGHT_LEG = [R_KNEE, R_ANKLE, R_HEEL, R_FOOT_INDEX]


# ---------- Geometry ----------
def _angle_3pts(a, b, c):
    """Angle ABC in degrees (at vertex b)."""
    bax = a["x"] - b["x"]
    bay = a["y"] - b["y"]
    bcx = c["x"] - b["x"]
    bcy = c["y"] - b["y"]
    dot = bax * bcx + bay * bcy
    mag_ba = math.hypot(bax, bay)
    mag_bc = math.hypot(bcx, bcy)
    if mag_ba < 1e-8 or mag_bc < 1e-8:
        return 90.0  # default neutral
    cosine = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cosine))


def _ema(prev, sample, alpha=EMA_ALPHA):
    """Exponential moving average."""
    if prev is None or prev == 0:
        return sample
    return alpha * prev + (1 - alpha) * sample


def _ema_point(prev, new, alpha=EMA_ALPHA):
    """EMA-smooth a landmark dict {x, y}."""
    if prev is None:
        return {"x": new["x"], "y": new["y"]}
    return {
        "x": alpha * prev["x"] + (1 - alpha) * new["x"],
        "y": alpha * prev["y"] + (1 - alpha) * new["y"],
    }


# ---------- Landmark helpers ----------
def _visibility(landmarks, idx):
    """Get visibility of a landmark by index."""
    if isinstance(landmarks, list):
        return landmarks[idx].get("visibility", 0.0)
    return landmarks.get(idx, {}).get("visibility", 0.0)


def _lm(landmarks, idx):
    """Get landmark by index."""
    if isinstance(landmarks, list):
        return landmarks[idx]
    return landmarks[idx]


def _leg_visible(landmarks, indices):
    """
    Check if a leg's landmarks are sufficiently visible.
    Knee and ankle must meet MIN_VISIBILITY; heel and toe only
    need FOOT_MIN_VISIBILITY (they are frequently low in MediaPipe).
    """
    knee_idx, ankle_idx, heel_idx, toe_idx = indices
    if _visibility(landmarks, knee_idx) < MIN_VISIBILITY:
        return False
    if _visibility(landmarks, ankle_idx) < MIN_VISIBILITY:
        return False
    if _visibility(landmarks, heel_idx) < FOOT_MIN_VISIBILITY:
        return False
    if _visibility(landmarks, toe_idx) < FOOT_MIN_VISIBILITY:
        return False
    return True


def _best_leg(landmarks):
    """
    Choose the leg with better overall visibility.
    Returns ('left', indices) or ('right', indices) or None.
    """
    left_vis = sum(_visibility(landmarks, i) for i in LEFT_LEG)
    right_vis = sum(_visibility(landmarks, i) for i in RIGHT_LEG)

    left_ok = _leg_visible(landmarks, LEFT_LEG)
    right_ok = _leg_visible(landmarks, RIGHT_LEG)

    if left_ok and right_ok:
        return ("left", LEFT_LEG) if left_vis >= right_vis else ("right", RIGHT_LEG)
    if left_ok:
        return ("left", LEFT_LEG)
    if right_ok:
        return ("right", RIGHT_LEG)
    return None


def _extract_landmarks(landmarks, leg_indices):
    """Extract normalised knee, ankle, heel, toe from the chosen leg."""
    knee_idx, ankle_idx, heel_idx, toe_idx = leg_indices
    return {
        "knee": {"x": _lm(landmarks, knee_idx)["x"], "y": _lm(landmarks, knee_idx)["y"]},
        "ankle": {"x": _lm(landmarks, ankle_idx)["x"], "y": _lm(landmarks, ankle_idx)["y"]},
        "heel": {"x": _lm(landmarks, heel_idx)["x"], "y": _lm(landmarks, heel_idx)["y"]},
        "toe": {"x": _lm(landmarks, toe_idx)["x"], "y": _lm(landmarks, toe_idx)["y"]},
    }


def _compute_ankle_angle(lm_dict):
    """Compute angle at ankle (knee → ankle → toe)."""
    return _angle_3pts(lm_dict["knee"], lm_dict["ankle"], lm_dict["toe"])


# ---------- State Constants ----------
WAITING = "WAITING"
NEUTRAL = "NEUTRAL"
DORSIFLEXION = "DORSIFLEXION"
PLANTARFLEXION = "PLANTARFLEXION"
COMPLETED = "COMPLETED"


# ---------- Main Analyzer ----------
def analyze_ankle_pumps(landmarks, state=None):
    """
    Ankle Pumps exercise analyzer.

    Returns dict with: instruction, progress, state, completed, reps,
    landmarks (normalised), ankle_angle, current_state, confidence.
    """
    now = time.time()
    state = state or {}

    # Initialise state fields
    state.setdefault("phase", WAITING)
    state.setdefault("reps", 0)
    state.setdefault("stabilize_start", None)
    state.setdefault("smoothed_angle", 0.0)
    state.setdefault("smoothed_knee", None)
    state.setdefault("smoothed_ankle", None)
    state.setdefault("smoothed_heel", None)
    state.setdefault("smoothed_toe", None)
    state.setdefault("active_leg", None)

    def result(instruction, lm_out=None, progress=None):
        if progress is None:
            progress = state["reps"] / TARGET_REPS
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["phase"] == COMPLETED,
            "reps": state["reps"],
            "ankle_landmarks": lm_out,
            "ankle_angle": round(state["smoothed_angle"], 1) if state["smoothed_angle"] else None,
            "current_state": state["phase"],
            "confidence": 0.0,
        }

    # ── Completed ──
    if state["phase"] == COMPLETED:
        # Build final landmarks from smoothed values
        lm_out = None
        if state["smoothed_ankle"] is not None:
            lm_out = {
                "knee": state["smoothed_knee"],
                "ankle": state["smoothed_ankle"],
                "heel": state["smoothed_heel"],
                "toe": state["smoothed_toe"],
            }
        return result("Ankle pumps complete — great job!", lm_out, 1.0)

    # ── No landmarks ──
    if not landmarks:
        state["stabilize_start"] = None
        return result("Adjust camera to see your feet and lower legs", None, 0)

    # ── Find best visible leg ──
    leg = _best_leg(landmarks)
    if leg is None:
        state["stabilize_start"] = None
        return result(
            "Adjust camera to clearly see your lower legs and feet", None, 0
        )

    leg_name, leg_indices = leg
    state["active_leg"] = leg_name

    # ── Extract raw landmarks ──
    raw_lm = _extract_landmarks(landmarks, leg_indices)

    # ── EMA-smooth landmark positions ──
    state["smoothed_knee"] = _ema_point(state["smoothed_knee"], raw_lm["knee"])
    state["smoothed_ankle"] = _ema_point(state["smoothed_ankle"], raw_lm["ankle"])
    state["smoothed_heel"] = _ema_point(state["smoothed_heel"], raw_lm["heel"])
    state["smoothed_toe"] = _ema_point(state["smoothed_toe"], raw_lm["toe"])

    lm_out = {
        "knee": state["smoothed_knee"],
        "ankle": state["smoothed_ankle"],
        "heel": state["smoothed_heel"],
        "toe": state["smoothed_toe"],
    }

    # ── Compute ankle angle ──
    raw_angle = _compute_ankle_angle(raw_lm)
    state["smoothed_angle"] = _ema(state["smoothed_angle"], raw_angle)
    angle = state["smoothed_angle"]

    # ── Confidence from visibility ──
    vis_sum = sum(_visibility(landmarks, i) for i in leg_indices)
    confidence = vis_sum / len(leg_indices)

    def result_with_conf(instruction, progress=None):
        r = result(instruction, lm_out, progress)
        r["confidence"] = round(confidence, 2)
        return r

    # ── State Machine ──
    phase = state["phase"]

    if phase == WAITING:
        # Wait for leg to be in a roughly neutral position
        if NEUTRAL_LOW <= angle <= NEUTRAL_HIGH:
            if state["stabilize_start"] is None:
                state["stabilize_start"] = now
            elif now - state["stabilize_start"] >= STABILIZE_TIME:
                state["phase"] = NEUTRAL
                state["stabilize_start"] = None
                return result_with_conf(
                    "Ready! Pull your toes up toward your shin"
                )
            return result_with_conf("Hold still — getting ready…")
        else:
            state["stabilize_start"] = None
            return result_with_conf(
                "Relax your feet in a neutral position"
            )

    if phase == NEUTRAL:
        # Waiting for dorsiflexion (toes up)
        if angle < DORSIFLEXION_THRESHOLD:
            state["phase"] = DORSIFLEXION
            return result_with_conf(
                "Good dorsiflexion! Now point your toes down"
            )

        # Check if they went to plantarflexion without dorsiflexion first
        if angle > PLANTARFLEXION_THRESHOLD:
            return result_with_conf(
                "Start by pulling your toes UP first, then point down"
            )

        return result_with_conf("Pull your toes up toward your shin")

    if phase == DORSIFLEXION:
        # Waiting for plantarflexion (toes down)
        if angle > PLANTARFLEXION_THRESHOLD:
            state["phase"] = PLANTARFLEXION
            return result_with_conf(
                "Good plantarflexion! Now bring feet back to neutral"
            )

        # Still in dorsiflexion range
        if angle < DORSIFLEXION_THRESHOLD:
            return result_with_conf(
                "Good — hold briefly, then point your toes down"
            )

        # Transitioning through neutral toward plantar
        return result_with_conf("Point your toes down slowly")

    if phase == PLANTARFLEXION:
        # Waiting for return to neutral → count rep
        if NEUTRAL_LOW <= angle <= NEUTRAL_HIGH:
            state["reps"] += 1
            if state["reps"] >= TARGET_REPS:
                state["phase"] = COMPLETED
                return result_with_conf(
                    "Ankle pumps complete — great job!", 1.0
                )
            state["phase"] = NEUTRAL
            return result_with_conf(
                f"Good repetition! ({state['reps']}/{TARGET_REPS}) "
                "Pull your toes up again"
            )

        # Still in plantarflexion
        if angle > PLANTARFLEXION_THRESHOLD:
            return result_with_conf(
                "Hold briefly, then bring feet back to neutral"
            )

        # Transitioning back up
        return result_with_conf("Move slowly back to neutral position")

    # Fallback
    return result_with_conf("Adjust camera to see your feet and lower legs")
