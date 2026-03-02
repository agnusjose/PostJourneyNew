import math
import time

# ─────────────────────────────────────────────────────────────────────────────
# Mini Squat Analyzer
#
# State machine (rep-based):
#   STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING (+1 rep)
#
# Camera: full-body side-front view (~30-45°), head → feet visible.
# ─────────────────────────────────────────────────────────────────────────────

# ---------- Constants ----------
MIN_VISIBILITY = 0.2
EMA_ALPHA = 0.35
TARGET_REPS = 10

# Knee angle thresholds (degrees at the knee joint: hip→knee→ankle)
STANDING_ANGLE = 168.0      # considered upright
DESCENDING_THRESH = 162.0   # start counting as descending
BOTTOM_MIN = 135.0          # too deep warning
BOTTOM_MAX = 160.0          # target zone upper (mini squat ≈ 145-160)
ASCENDING_THRESH = 155.0    # knee opening back up

# Hip angle (trunk lean)
HIP_LEAN_MAX = 50.0         # max forward lean — very lenient for elderly

# MediaPipe indices
L_SHOULDER = 11; R_SHOULDER = 12
L_HIP = 23;     R_HIP = 24
L_KNEE = 25;    R_KNEE = 26
L_ANKLE = 27;   R_ANKLE = 28

REQUIRED = [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE]

# States
STANDING = "STANDING"
DESCENDING = "DESCENDING"
BOTTOM = "BOTTOM"
ASCENDING = "ASCENDING"


# ---------- Geometry ----------
def _angle_at(a, b, c):
    """Angle at point b formed by a-b-c, in degrees."""
    ba = {"x": a["x"] - b["x"], "y": a["y"] - b["y"]}
    bc = {"x": c["x"] - b["x"], "y": c["y"] - b["y"]}
    dot = ba["x"] * bc["x"] + ba["y"] * bc["y"]
    mag_ba = math.hypot(ba["x"], ba["y"])
    mag_bc = math.hypot(bc["x"], bc["y"])
    if mag_ba < 1e-8 or mag_bc < 1e-8:
        return 180.0
    cosine = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cosine))


def _midpoint(a, b):
    return {"x": (a["x"] + b["x"]) / 2.0, "y": (a["y"] + b["y"]) / 2.0}


def _ema(prev, sample, alpha=EMA_ALPHA):
    if prev is None:
        return sample
    return alpha * prev + (1 - alpha) * sample


# ---------- Landmark helpers ----------
def _lm(landmarks, idx):
    return landmarks[idx]


def _vis(landmarks, idx):
    return landmarks[idx].get("visibility", 0.0)


def _all_vis(landmarks, indices):
    return all(_vis(landmarks, i) >= MIN_VISIBILITY for i in indices)


def _best_leg(landmarks):
    """Pick the leg with better visibility."""
    l_vis = min(_vis(landmarks, L_HIP), _vis(landmarks, L_KNEE), _vis(landmarks, L_ANKLE))
    r_vis = min(_vis(landmarks, R_HIP), _vis(landmarks, R_KNEE), _vis(landmarks, R_ANKLE))
    if l_vis >= r_vis:
        return L_HIP, L_KNEE, L_ANKLE
    return R_HIP, R_KNEE, R_ANKLE


# ---------- Main Analyzer ----------
def analyze_mini_squat(landmarks, state=None):
    now = time.time()
    state = state or {}

    state.setdefault("phase", STANDING)
    state.setdefault("reps", 0)
    state.setdefault("smoothed_knee", None)
    state.setdefault("smoothed_hip", None)

    def result(instruction, progress=None):
        if progress is None:
            progress = state["reps"] / TARGET_REPS
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["reps"] >= TARGET_REPS,
            "reps": state["reps"],
            "knee_angle": round(state["smoothed_knee"] or 0, 1),
            "hip_angle": round(state["smoothed_hip"] or 0, 1),
            "current_state": state["phase"],
            "confidence": 0.0,
        }

    # ── Completed ──
    if state["reps"] >= TARGET_REPS:
        return result("Exercise complete!", 1.0)

    # ── No landmarks ──
    if not landmarks:
        return result("Adjust camera, full body")

    # ── Visibility ──
    if not _all_vis(landmarks, REQUIRED):
        return result("Full body must be visible")

    # ── Extract key points ──
    hip_idx, knee_idx, ankle_idx = _best_leg(landmarks)
    hip = _lm(landmarks, hip_idx)
    knee = _lm(landmarks, knee_idx)
    ankle = _lm(landmarks, ankle_idx)
    shoulder_mid = _midpoint(_lm(landmarks, L_SHOULDER), _lm(landmarks, R_SHOULDER))
    hip_mid = _midpoint(_lm(landmarks, L_HIP), _lm(landmarks, R_HIP))

    # ── Knee angle ──
    raw_knee = _angle_at(hip, knee, ankle)
    state["smoothed_knee"] = _ema(state["smoothed_knee"], raw_knee)
    ka = state["smoothed_knee"]

    # ── Hip angle (trunk lean) ──
    raw_hip = _angle_at(shoulder_mid, hip_mid, {"x": hip_mid["x"], "y": hip_mid["y"] + 0.3})
    state["smoothed_hip"] = _ema(state["smoothed_hip"], raw_hip)
    ha = state["smoothed_hip"]

    # ── Confidence ──
    vis_sum = sum(_vis(landmarks, i) for i in REQUIRED)
    confidence = vis_sum / len(REQUIRED)

    def result_c(instruction, progress=None):
        r = result(instruction, progress)
        r["confidence"] = round(confidence, 2)
        return r

    # (Hip lean check removed — forward lean is natural during mini squats)

    # ── Safety: too deep ──
    if ka < BOTTOM_MIN and state["phase"] in (DESCENDING, BOTTOM):
        return result_c("Too deep, come back up")

    # ── State machine ──
    phase = state["phase"]

    if phase == STANDING:
        if ka <= DESCENDING_THRESH:
            state["phase"] = DESCENDING
            return result_c("Good, bend a little more")
        return result_c("Slowly bend your knees")

    if phase == DESCENDING:
        if ka <= BOTTOM_MAX:
            state["phase"] = BOTTOM
            return result_c("Good depth, now rise")
        return result_c("Bend a little more")

    if phase == BOTTOM:
        if ka > BOTTOM_MAX:
            state["phase"] = ASCENDING
            return result_c("Good, stand back up")
        return result_c("Good depth, now rise")

    if phase == ASCENDING:
        if ka >= STANDING_ANGLE:
            state["reps"] += 1
            state["phase"] = STANDING
            if state["reps"] >= TARGET_REPS:
                return result_c("Exercise complete!", 1.0)
            return result_c(f"Rep {state['reps']}, keep going")
        return result_c("Stand all the way up")

    return result_c("Stand facing camera")