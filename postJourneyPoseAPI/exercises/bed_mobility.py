import numpy as np
import math
import time

# ─────────────────────────────────────────────────────────────────────────────
# Bed Mobility – Rolling (Supine → Side-Lying)
#
# State machine:  SUPINE → KNEE_BENT → ARM_REACH → CORE_ROTATION → SIDE_LYING
#
# Camera must be at bed height, side view, full body visible (head → feet).
# The backend applies cv2.flip(img, 1) before MediaPipe, so MediaPipe
# left/right are swapped relative to the user's actual sides.
# ─────────────────────────────────────────────────────────────────────────────

# ---------- Constants ----------
MIN_VISIBILITY = 0.5
EMA_ALPHA = 0.4

# Thresholds
KNEE_FLEXION_THRESHOLD = 45.0       # degrees — knee must bend past this
ARM_CROSS_MIDLINE_MARGIN = 0.02     # normalised x-distance past midline
TORSO_ROTATION_INITIATION = 25.0    # degrees — rotation has started
TORSO_ROTATION_SIDE_LYING = 75.0    # degrees — side-lying achieved
HEAD_LEAD_MAX = 20.0                # degrees — head shouldn't lead torso by more

# MediaPipe landmark indices
NOSE = 0
L_SHOULDER = 11     # MP left shoulder → user's RIGHT (after flip)
R_SHOULDER = 12     # MP right shoulder → user's LEFT (after flip)
L_HIP = 23          # MP left hip → user's RIGHT
R_HIP = 24          # MP right hip → user's LEFT
L_KNEE = 25         # MP left knee → user's RIGHT
R_KNEE = 26         # MP right knee → user's LEFT
L_ANKLE = 27
R_ANKLE = 28
L_WRIST = 15        # MP left wrist → user's RIGHT
R_WRIST = 16        # MP right wrist → user's LEFT

REQUIRED_LANDMARKS = [NOSE, L_SHOULDER, R_SHOULDER, L_HIP, R_HIP,
                      L_KNEE, R_KNEE, L_WRIST, R_WRIST]


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


def _line_angle(p1, p2):
    """Angle of line p1→p2 relative to horizontal (degrees)."""
    dx = p2["x"] - p1["x"]
    dy = p2["y"] - p1["y"]
    return math.degrees(math.atan2(dy, dx))


def _torso_rotation(l_shoulder, r_shoulder, l_hip, r_hip):
    """
    Compute the angular difference between the shoulder line and hip line.
    In a supine position viewed from the side, both lines are roughly
    horizontal (≈0°). As the patient rolls, the shoulder line rotates
    more than the hip line, creating a measurable angle.
    """
    shoulder_angle = _line_angle(l_shoulder, r_shoulder)
    hip_angle = _line_angle(l_hip, r_hip)
    diff = abs(shoulder_angle - hip_angle)
    if diff > 180:
        diff = 360 - diff
    return diff


def _shoulder_depth_rotation(l_shoulder, r_shoulder):
    """
    Estimate torso rotation from the apparent width of the shoulders.
    When supine (side view), shoulders are nearly overlapping (small x-gap).
    When rolling, one shoulder moves away.  We use the vertical (y) spread
    of the shoulder line as a proxy for rotation when the x-separation
    is small (side camera).
    """
    dx = abs(l_shoulder["x"] - r_shoulder["x"])
    dy = abs(l_shoulder["y"] - r_shoulder["y"])
    # Use the ratio of vertical to total span
    total = math.hypot(dx, dy)
    if total < 1e-6:
        return 0.0
    # When supine side-view, dy ≈ 0.  When rolling, dy grows.
    return math.degrees(math.atan2(dy, max(dx, 1e-6)))


def _ema(prev, sample, alpha=EMA_ALPHA):
    """Exponential moving average."""
    if prev is None or prev == 0:
        return sample
    return alpha * prev + (1 - alpha) * sample


def _landmarks_visible(landmarks, indices):
    """Return True if all landmarks in indices have visibility ≥ threshold."""
    for i in indices:
        lm = landmarks[i] if isinstance(landmarks, list) else landmarks.get(i)
        if lm is None:
            return False
        if lm.get("visibility", 0.0) < MIN_VISIBILITY:
            return False
    return True


def _lm(landmarks, idx):
    """Get landmark by index, supporting both list and dict."""
    if isinstance(landmarks, list):
        return landmarks[idx]
    return landmarks[idx]


def _midline_x(landmarks):
    """X-coordinate of the body midline (average of left & right hips)."""
    return (_lm(landmarks, L_HIP)["x"] + _lm(landmarks, R_HIP)["x"]) / 2.0


# ---------- Roll Side Detection ----------
def _detect_roll_side(landmarks, state):
    """
    Determine which side the patient is rolling toward based on which
    knee is bending.

    After cv2.flip:
      MP L_KNEE (25) = user's RIGHT knee
      MP R_KNEE (26) = user's LEFT knee
    """
    # User's RIGHT knee (MP left)
    right_knee_angle = _angle_3pts(
        _lm(landmarks, L_HIP),
        _lm(landmarks, L_KNEE),
        _lm(landmarks, L_ANKLE),
    )
    # User's LEFT knee (MP right)
    left_knee_angle = _angle_3pts(
        _lm(landmarks, R_HIP),
        _lm(landmarks, R_KNEE),
        _lm(landmarks, R_ANKLE),
    )

    # Lower angle = more flexion.  The side with more flexion is the roll side.
    right_flexion = 180.0 - right_knee_angle
    left_flexion = 180.0 - left_knee_angle

    if right_flexion > left_flexion and right_flexion > KNEE_FLEXION_THRESHOLD:
        return "RIGHT", right_flexion
    elif left_flexion > right_flexion and left_flexion > KNEE_FLEXION_THRESHOLD:
        return "LEFT", left_flexion
    # Not yet determined — return best candidate
    if right_flexion > left_flexion:
        return "RIGHT", right_flexion
    return "LEFT", left_flexion


def _get_knee_flexion(landmarks, roll_side):
    """Knee flexion angle for the target roll side."""
    if roll_side == "RIGHT":
        angle = _angle_3pts(
            _lm(landmarks, L_HIP),
            _lm(landmarks, L_KNEE),
            _lm(landmarks, L_ANKLE),
        )
    else:
        angle = _angle_3pts(
            _lm(landmarks, R_HIP),
            _lm(landmarks, R_KNEE),
            _lm(landmarks, R_ANKLE),
        )
    return 180.0 - angle  # convert to flexion


def _opposite_wrist_crosses_midline(landmarks, roll_side):
    """
    Check if the opposite arm's wrist has crossed the body midline.
    Rolling RIGHT → opposite arm is user's LEFT → MP R_WRIST (16).
    Rolling LEFT  → opposite arm is user's RIGHT → MP L_WRIST (15).
    """
    midline = _midline_x(landmarks)

    if roll_side == "RIGHT":
        wrist = _lm(landmarks, R_WRIST)  # user's LEFT wrist
        # Crossing midline means wrist.x moved toward the roll side
        # After flip, rolling right = wrist x decreases past midline (or increases, depends on orientation)
        # We simply check if the wrist is on the opposite side of the midline from where it started
        return abs(wrist["x"] - midline) > ARM_CROSS_MIDLINE_MARGIN
    else:
        wrist = _lm(landmarks, L_WRIST)  # user's RIGHT wrist
        return abs(wrist["x"] - midline) > ARM_CROSS_MIDLINE_MARGIN


def _compute_torso_rotation(landmarks):
    """Compute overall torso rotation using both methods, return max."""
    rot1 = _torso_rotation(
        _lm(landmarks, L_SHOULDER), _lm(landmarks, R_SHOULDER),
        _lm(landmarks, L_HIP), _lm(landmarks, R_HIP),
    )
    rot2 = _shoulder_depth_rotation(
        _lm(landmarks, L_SHOULDER), _lm(landmarks, R_SHOULDER),
    )
    return max(rot1, rot2)


def _head_leads_torso(landmarks):
    """
    Check if head is rotating significantly ahead of the torso.
    Compare nose displacement from shoulder midline against torso rotation.
    """
    nose = _lm(landmarks, NOSE)
    mid_shoulder_x = (_lm(landmarks, L_SHOULDER)["x"] + _lm(landmarks, R_SHOULDER)["x"]) / 2
    mid_shoulder_y = (_lm(landmarks, L_SHOULDER)["y"] + _lm(landmarks, R_SHOULDER)["y"]) / 2

    head_offset = math.hypot(nose["x"] - mid_shoulder_x, nose["y"] - mid_shoulder_y)
    # normalise by shoulder width
    shoulder_span = math.hypot(
        _lm(landmarks, L_SHOULDER)["x"] - _lm(landmarks, R_SHOULDER)["x"],
        _lm(landmarks, L_SHOULDER)["y"] - _lm(landmarks, R_SHOULDER)["y"],
    )
    if shoulder_span < 1e-6:
        return False
    return (head_offset / shoulder_span) > 1.5  # head significantly displaced


# ---------- State Constants ----------
SUPINE = "SUPINE"
KNEE_BENT = "KNEE_BENT"
ARM_REACH = "ARM_REACH"
CORE_ROTATION = "CORE_ROTATION"
SIDE_LYING = "SIDE_LYING"

PHASE_ORDER = [SUPINE, KNEE_BENT, ARM_REACH, CORE_ROTATION, SIDE_LYING]
PHASE_LABELS = {
    SUPINE: "Lie flat on your back",
    KNEE_BENT: "Bend knee",
    ARM_REACH: "Reach across",
    CORE_ROTATION: "Rotate trunk",
    SIDE_LYING: "Side-lying",
}


# ---------- Main Analyzer ----------
def analyze_bed_mobility(landmarks, state=None):
    """
    Bed Mobility – Rolling (Supine → Side-Lying) analyzer.

    Called by the WebRTC recv loop with full-body landmarks (list of dicts)
    and a mutable state dict (persisted across frames).

    Returns a dict with: instruction, progress, state, completed, roll_side,
    current_phase, knee_flexion, torso_rotation, confidence.
    """
    now = time.time()
    state = state or {}

    # Initialise state fields
    state.setdefault("phase", SUPINE)
    state.setdefault("roll_side", None)
    state.setdefault("smoothed_knee", 0.0)
    state.setdefault("smoothed_torso", 0.0)
    state.setdefault("prev_torso", 0.0)
    state.setdefault("stabilize_start", None)
    state.setdefault("success_time", None)

    def result(instruction, progress=None):
        phase = state["phase"]
        phase_idx = PHASE_ORDER.index(phase) if phase in PHASE_ORDER else 0
        if progress is None:
            progress = phase_idx / (len(PHASE_ORDER) - 1)
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": phase == SIDE_LYING and state.get("success_time") is not None,
            "roll_side": state.get("roll_side"),
            "current_phase": phase,
            "knee_flexion": round(state["smoothed_knee"], 1),
            "torso_rotation": round(state["smoothed_torso"], 1),
            "confidence": 0.0,
        }

    # ── Completed guard ──
    if state["phase"] == SIDE_LYING and state.get("success_time"):
        return result("Excellent roll — well done!", 1.0)

    # ── No landmarks ──
    if not landmarks:
        state["stabilize_start"] = None
        return result("Lie in view of the camera so your full body is visible", 0)

    # ── Visibility check ──
    if not _landmarks_visible(landmarks, REQUIRED_LANDMARKS):
        state["stabilize_start"] = None
        return result("Ensure your full body is visible — head to feet", 0)

    # ── Compute metrics ──
    roll_side = state.get("roll_side")

    # Detect or confirm roll side
    detected_side, knee_flex = _detect_roll_side(landmarks, state)
    if roll_side is None:
        # Auto-detect from first significant knee bend
        if knee_flex > KNEE_FLEXION_THRESHOLD:
            state["roll_side"] = detected_side
            roll_side = detected_side
    else:
        # Keep tracking the chosen side
        knee_flex = _get_knee_flexion(landmarks, roll_side)

    # Smooth knee flexion
    state["smoothed_knee"] = _ema(state["smoothed_knee"], knee_flex)
    knee = state["smoothed_knee"]

    # Torso rotation
    raw_torso = _compute_torso_rotation(landmarks)
    state["smoothed_torso"] = _ema(state["smoothed_torso"], raw_torso)
    torso = state["smoothed_torso"]
    state["prev_torso"] = torso

    # Confidence from average visibility of required landmarks
    vis_sum = 0.0
    for idx in REQUIRED_LANDMARKS:
        vis_sum += _lm(landmarks, idx).get("visibility", 0.0)
    confidence = vis_sum / len(REQUIRED_LANDMARKS)

    # Head-torso coordination
    head_leading = _head_leads_torso(landmarks)

    # Cross-body arm reach
    arm_crossed = False
    if roll_side:
        arm_crossed = _opposite_wrist_crosses_midline(landmarks, roll_side)

    # Update confidence in result
    def result_with_conf(instruction, progress=None):
        r = result(instruction, progress)
        r["confidence"] = round(confidence, 2)
        return r

    # ── State Machine ──
    phase = state["phase"]

    if phase == SUPINE:
        if knee > KNEE_FLEXION_THRESHOLD and roll_side:
            state["phase"] = KNEE_BENT
            side_label = roll_side.lower()
            return result_with_conf(
                f"Good — knee bent on the {side_label} side. "
                f"Now reach across with your {'left' if roll_side == 'RIGHT' else 'right'} arm"
            )
        # Prompt
        return result_with_conf(
            "Bend the knee on the side you want to roll toward"
        )

    if phase == KNEE_BENT:
        # Check for regression
        if knee < KNEE_FLEXION_THRESHOLD * 0.6:
            state["phase"] = SUPINE
            return result_with_conf("Keep your knee bent — try again")

        # Check for arm reach
        if arm_crossed:
            state["phase"] = ARM_REACH
            return result_with_conf(
                "Good arm reach! Now engage your core and rotate your trunk"
            )

        # Check if patient skipped to rotation
        if torso > TORSO_ROTATION_INITIATION:
            return result_with_conf(
                "Reach across your body with the opposite arm before rotating"
            )

        opposite = "left" if roll_side == "RIGHT" else "right"
        return result_with_conf(
            f"Reach across your body with your {opposite} arm"
        )

    if phase == ARM_REACH:
        # Check for regression
        if knee < KNEE_FLEXION_THRESHOLD * 0.5:
            state["phase"] = SUPINE
            state["roll_side"] = None
            return result_with_conf("Position lost — start again by bending your knee")

        # Check for core rotation
        if torso > TORSO_ROTATION_INITIATION:
            state["phase"] = CORE_ROTATION
            return result_with_conf(
                "Good rotation starting — keep rolling your shoulders together"
            )

        return result_with_conf(
            "Engage your core and begin rotating your trunk"
        )

    if phase == CORE_ROTATION:
        # Check for regression
        if torso < TORSO_ROTATION_INITIATION * 0.5:
            state["phase"] = ARM_REACH
            return result_with_conf(
                "Rotation lost — reach across and try rotating again"
            )

        # Head-torso coordination check
        if head_leading:
            return result_with_conf(
                "Let your shoulders lead the roll — don't turn just your head"
            )

        # Check for side-lying
        if torso >= TORSO_ROTATION_SIDE_LYING:
            state["phase"] = SIDE_LYING
            state["success_time"] = now
            return result_with_conf(
                "Excellent roll — well done! You're in a stable side-lying position",
                1.0,
            )

        # Progress feedback
        pct = int((torso / TORSO_ROTATION_SIDE_LYING) * 100)
        return result_with_conf(
            f"Keep rolling — torso rotation at {pct}%. "
            "Engage your core and roll your shoulders together"
        )

    if phase == SIDE_LYING:
        state["success_time"] = state.get("success_time") or now
        return result_with_conf("Excellent roll — well done!", 1.0)

    # Fallback
    return result_with_conf("Lie flat on your back to begin")
