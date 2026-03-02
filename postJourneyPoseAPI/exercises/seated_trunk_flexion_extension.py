import math
import time

# ─────────────────────────────────────────────────────────────────────────────
# Seated Trunk Flexion–Extension Analyzer
#
# State machine:  UPRIGHT → FLEXION → EXTENSION → UPRIGHT (+1 rep)
#
# Camera: side view, upper body visible (head → shoulders → hips → knees).
# Backend applies cv2.flip(img, 1) before MediaPipe.
# ─────────────────────────────────────────────────────────────────────────────

# ---------- Constants ----------
MIN_VISIBILITY = 0.2
EMA_ALPHA = 0.4
TARGET_REPS = 5

# Trunk angle thresholds (shoulder-mid → hip-mid vs vertical)
UPRIGHT_MAX = 15.0            # degrees — considered upright
FLEXION_ENTRY = 25.0          # degrees — flexion begins
FLEXION_DEEP = 55.0           # degrees — good deep flexion
EXCESSIVE_FLEXION = 72.0      # degrees — warn
EXTENSION_RETURN = 18.0       # degrees — returning to upright

# Speed / safety
JERK_THRESHOLD = 12.0         # degrees per frame — too fast
HIP_DRIFT_MAX = 0.06          # normalised — hips should stay still (seated)
HEAD_LEAD_FACTOR = 0.25       # head shouldn't lead torso by > this fraction

STABILIZE_TIME = 1.5          # seconds to confirm upright before start

# MediaPipe landmark indices (after cv2.flip)
NOSE = 0
L_SHOULDER = 11
R_SHOULDER = 12
L_HIP = 23
R_HIP = 24
L_KNEE = 25
R_KNEE = 26

REQUIRED_LANDMARKS = [NOSE, L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_KNEE, R_KNEE]


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
        return 0.0
    cosine = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cosine))


def _midpoint(a, b):
    return {"x": (a["x"] + b["x"]) / 2.0, "y": (a["y"] + b["y"]) / 2.0}


def _trunk_angle(shoulder_mid, hip_mid):
    """
    Angle of the trunk from vertical.
    0° = perfectly upright; positive = forward flexion.
    Uses the line from hip_mid → shoulder_mid vs. a vertical line upward.
    In normalised coords, y increases downward, so 'up' is y-negative.
    """
    dx = shoulder_mid["x"] - hip_mid["x"]
    dy = shoulder_mid["y"] - hip_mid["y"]  # negative when upright (shoulder above hip)
    # Vertical reference: straight up from hip = (0, -1)
    # Angle between (dx, dy) and (0, -1)
    dot = -dy  # dx*0 + dy*(-1)
    mag = math.hypot(dx, dy)
    if mag < 1e-8:
        return 0.0
    cosine = max(-1.0, min(1.0, dot / mag))
    return math.degrees(math.acos(cosine))


def _ema(prev, sample, alpha=EMA_ALPHA):
    if prev is None or prev == 0:
        return sample
    return alpha * prev + (1 - alpha) * sample


def _ema_point(prev, new, alpha=EMA_ALPHA):
    if prev is None:
        return {"x": new["x"], "y": new["y"]}
    return {
        "x": alpha * prev["x"] + (1 - alpha) * new["x"],
        "y": alpha * prev["y"] + (1 - alpha) * new["y"],
    }


# ---------- Landmark helpers ----------
def _lm(landmarks, idx):
    if isinstance(landmarks, list):
        return landmarks[idx]
    return landmarks[idx]


def _visibility(landmarks, idx):
    if isinstance(landmarks, list):
        return landmarks[idx].get("visibility", 0.0)
    return landmarks.get(idx, {}).get("visibility", 0.0)


def _all_visible(landmarks, indices):
    for i in indices:
        if _visibility(landmarks, i) < MIN_VISIBILITY:
            return False
    return True


def _extract_overlay(landmarks):
    """Extract normalised overlay landmarks for the frontend."""
    def pt(idx):
        lm = _lm(landmarks, idx)
        return {"x": lm["x"], "y": lm["y"]}
    return {
        "nose": pt(NOSE),
        "left_shoulder": pt(L_SHOULDER),
        "right_shoulder": pt(R_SHOULDER),
        "left_hip": pt(L_HIP),
        "right_hip": pt(R_HIP),
        "left_knee": pt(L_KNEE),
        "right_knee": pt(R_KNEE),
    }


# ---------- State Constants ----------
WAITING = "WAITING"
UPRIGHT = "UPRIGHT"
FLEXION = "FLEXION"
EXTENSION = "EXTENSION"
COMPLETED = "COMPLETED"


# ---------- Main Analyzer ----------
def analyze_seated_trunk_flexion_extension(landmarks, state=None):
    """
    Seated Trunk Flexion–Extension analyzer.

    Returns dict with: instruction, progress, state, completed, reps,
    trunk_landmarks (normalised), trunk_angle, current_state, confidence.
    """
    now = time.time()
    state = state or {}

    # Initialise state fields
    state.setdefault("phase", WAITING)
    state.setdefault("reps", 0)
    state.setdefault("stabilize_start", None)
    state.setdefault("smoothed_angle", 0.0)
    state.setdefault("prev_angle", 0.0)
    state.setdefault("hip_baseline", None)
    state.setdefault("peak_flexion", 0.0)
    # Smoothed overlay points
    state.setdefault("s_nose", None)
    state.setdefault("s_lshoulder", None)
    state.setdefault("s_rshoulder", None)
    state.setdefault("s_lhip", None)
    state.setdefault("s_rhip", None)
    state.setdefault("s_lknee", None)
    state.setdefault("s_rknee", None)

    def result(instruction, lm_out=None, progress=None):
        if progress is None:
            progress = state["reps"] / TARGET_REPS
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["phase"] == COMPLETED,
            "reps": state["reps"],
            "trunk_landmarks": lm_out,
            "trunk_angle": round(state["smoothed_angle"], 1) if state["smoothed_angle"] else None,
            "current_state": state["phase"],
            "confidence": 0.0,
        }

    # ── Completed ──
    if state["phase"] == COMPLETED:
        lm_out = _build_smoothed(state)
        return result("Exercise complete, great job!", lm_out, 1.0)

    # ── No landmarks ──
    if not landmarks:
        state["stabilize_start"] = None
        return result("Adjust camera, side view", None, 0)

    # ── Visibility check ──
    if not _all_visible(landmarks, REQUIRED_LANDMARKS):
        state["stabilize_start"] = None
        return result("Full body must be visible", None, 0)

    # ── Extract & smooth overlay landmarks ──
    raw_overlay = _extract_overlay(landmarks)
    state["s_nose"] = _ema_point(state["s_nose"], raw_overlay["nose"])
    state["s_lshoulder"] = _ema_point(state["s_lshoulder"], raw_overlay["left_shoulder"])
    state["s_rshoulder"] = _ema_point(state["s_rshoulder"], raw_overlay["right_shoulder"])
    state["s_lhip"] = _ema_point(state["s_lhip"], raw_overlay["left_hip"])
    state["s_rhip"] = _ema_point(state["s_rhip"], raw_overlay["right_hip"])
    state["s_lknee"] = _ema_point(state["s_lknee"], raw_overlay["left_knee"])
    state["s_rknee"] = _ema_point(state["s_rknee"], raw_overlay["right_knee"])

    lm_out = _build_smoothed(state)

    # ── Compute trunk angle ──
    shoulder_mid = _midpoint(_lm(landmarks, L_SHOULDER), _lm(landmarks, R_SHOULDER))
    hip_mid = _midpoint(_lm(landmarks, L_HIP), _lm(landmarks, R_HIP))
    raw_angle = _trunk_angle(shoulder_mid, hip_mid)
    state["smoothed_angle"] = _ema(state["smoothed_angle"], raw_angle)
    angle = state["smoothed_angle"]

    # Speed check
    angle_delta = abs(angle - state["prev_angle"])
    state["prev_angle"] = angle

    # Hip stability check
    hip_mid_now = _midpoint(raw_overlay["left_hip"], raw_overlay["right_hip"])
    if state["hip_baseline"] is None:
        state["hip_baseline"] = hip_mid_now
    hip_drift = math.hypot(
        hip_mid_now["x"] - state["hip_baseline"]["x"],
        hip_mid_now["y"] - state["hip_baseline"]["y"],
    )

    # ── Confidence ──
    vis_sum = sum(_visibility(landmarks, i) for i in REQUIRED_LANDMARKS)
    confidence = vis_sum / len(REQUIRED_LANDMARKS)

    def result_c(instruction, progress=None):
        r = result(instruction, lm_out, progress)
        r["confidence"] = round(confidence, 2)
        return r

    # ── Safety checks (applied in any phase) ──
    if angle > EXCESSIVE_FLEXION and state["phase"] not in (WAITING, COMPLETED):
        return result_c("Too far, come back up")

    if angle_delta > JERK_THRESHOLD and state["phase"] not in (WAITING, COMPLETED):
        return result_c("Slow down")

    if hip_drift > HIP_DRIFT_MAX and state["phase"] not in (WAITING, COMPLETED):
        return result_c("Keep hips still")

    # ── State Machine ──
    phase = state["phase"]

    if phase == WAITING:
        if angle <= UPRIGHT_MAX:
            if state["stabilize_start"] is None:
                state["stabilize_start"] = now
            elif now - state["stabilize_start"] >= STABILIZE_TIME:
                state["phase"] = UPRIGHT
                state["stabilize_start"] = None
                state["hip_baseline"] = hip_mid_now
                return result_c("Ready! Bend forward slowly")
            return result_c("Sit upright, getting ready")
        else:
            state["stabilize_start"] = None
            return result_c("Sit upright to start")

    if phase == UPRIGHT:
        if angle >= FLEXION_ENTRY:
            state["phase"] = FLEXION
            state["peak_flexion"] = angle
            return result_c("Good, keep bending")

        return result_c("Bend forward slowly")

    if phase == FLEXION:
        # Track peak flexion
        if angle > state.get("peak_flexion", 0):
            state["peak_flexion"] = angle

        # Check if patient has reached good depth and is now returning
        if angle < state["peak_flexion"] - 8.0 and state["peak_flexion"] >= FLEXION_ENTRY:
            state["phase"] = EXTENSION
            return result_c("Good, now sit back up")

        # Still going deeper
        if angle >= FLEXION_DEEP:
            return result_c("Good depth, return up")

        return result_c("Keep bending forward")

    if phase == EXTENSION:
        # Check for return to upright
        if angle <= EXTENSION_RETURN:
            state["reps"] += 1
            state["peak_flexion"] = 0.0
            state["hip_baseline"] = hip_mid_now
            if state["reps"] >= TARGET_REPS:
                state["phase"] = COMPLETED
                return result_c("Exercise complete, great job!", 1.0)
            state["phase"] = UPRIGHT
            return result_c(f"Good rep! {state['reps']} of {TARGET_REPS}")

        # Still returning
        return result_c("Keep coming up")

    # Fallback
    return result_c("Sit upright, side view")


def _build_smoothed(state):
    """Build smoothed overlay dict from state."""
    if state.get("s_nose") is None:
        return None
    return {
        "nose": state["s_nose"],
        "left_shoulder": state["s_lshoulder"],
        "right_shoulder": state["s_rshoulder"],
        "left_hip": state["s_lhip"],
        "right_hip": state["s_rhip"],
        "left_knee": state["s_lknee"],
        "right_knee": state["s_rknee"],
    }
