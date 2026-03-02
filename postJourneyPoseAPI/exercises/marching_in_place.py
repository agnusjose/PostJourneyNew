import numpy as np
import time

# ---------- Geometry ----------
def calculate_angle(a, b, c):
    """Angle at point b formed by points a-b-c, in degrees."""
    a = np.array([a["x"], a["y"]])
    b_pt = np.array([b["x"], b["y"]])
    c = np.array([c["x"], c["y"]])

    ba = a - b_pt
    bc = c - b_pt

    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    return float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0))))


def vertical_angle(upper, lower):
    """Angle of the segment (upper->lower) relative to vertical axis."""
    dx = lower["x"] - upper["x"]
    dy = lower["y"] - upper["y"]
    return float(abs(np.degrees(np.arctan2(dx, dy))))


# ---------- Constants ----------
TARGET_REPS = 20                # one rep = both legs lifted once
# Hip-knee-ankle angle thresholds (standing ≈ 170°, knee lifted ≈ 90-120°)
KNEE_LIFT_ANGLE = 125           # tighter for better accuracy (was 140)
KNEE_DOWN_ANGLE = 145           # (was 150)
TORSO_LEAN_MAX = 20.0           # slightly stricter (was 25)
STABILIZE_TIME = 1.5            # seconds to confirm standing posture
MIN_VISIBILITY = 0.1
EMA_ALPHA = 0.4                 # smoothing factor

# MediaPipe landmark indices
# Nose=0, L_Shoulder=11, R_Shoulder=12, L_Hip=23, R_Hip=24,
# L_Knee=25, R_Knee=26, L_Ankle=27, R_Ankle=28,
# L_Wrist=15, R_Wrist=16
REQUIRED_LANDMARKS = [0, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28]

# NOTE on left/right:
# The backend applies cv2.flip(img, 1) before MediaPipe processes the frame.
# This mirrors the image, which swaps MediaPipe's left/right labelling.
# MediaPipe landmark 25 ("left knee") → actually the user's RIGHT knee after flip.
# MediaPipe landmark 26 ("right knee") → actually the user's LEFT knee after flip.
# We use _MP_ prefixed variables for MediaPipe indices, and swap labels for the user.
# In the state machine: "left"/"right" always means the USER's actual side.
_MP_L_HIP = 23      # MediaPipe left hip → user's RIGHT hip (after flip)
_MP_R_HIP = 24      # MediaPipe right hip → user's LEFT hip (after flip)
_MP_L_KNEE = 25     # MediaPipe left knee → user's RIGHT knee
_MP_R_KNEE = 26     # MediaPipe right knee → user's LEFT knee
_MP_L_ANKLE = 27    # MediaPipe left ankle → user's RIGHT ankle
_MP_R_ANKLE = 28    # MediaPipe right ankle → user's LEFT ankle
_MP_L_WRIST = 15    # MediaPipe left wrist → user's RIGHT wrist
_MP_R_WRIST = 16    # MediaPipe right wrist → user's LEFT wrist
_MP_L_SHOULDER = 11 # MediaPipe left shoulder → user's RIGHT shoulder
_MP_R_SHOULDER = 12 # MediaPipe right shoulder → user's LEFT shoulder


# ---------- Landmark Helpers ----------
def landmarks_visible(landmarks, indices):
    """Check if all specified landmarks are sufficiently visible."""
    for i in indices:
        if landmarks[i]["visibility"] < MIN_VISIBILITY:
            return False
    return True


def avg_point(landmarks, a, b):
    """Average of two landmarks."""
    return {
        "x": (landmarks[a]["x"] + landmarks[b]["x"]) / 2,
        "y": (landmarks[a]["y"] + landmarks[b]["y"]) / 2,
    }


def knee_angle(hip, knee, ankle):
    """Hip-knee-ankle angle. Standing ≈ 170°, knee lifted ≈ 90-120°."""
    return calculate_angle(hip, knee, ankle)


def check_cross_body(landmarks, user_side):
    """
    Return True if the opposite arm is swinging forward.
    user_side: 'left' means user's left knee is up, so user's right arm should swing.
    After the cv2.flip, user's right arm = MediaPipe LEFT wrist/shoulder.
    """
    if user_side == "left":
        # User's right arm = MediaPipe left side (after flip)
        wrist = landmarks[_MP_L_WRIST]
        shoulder = landmarks[_MP_L_SHOULDER]
    else:
        # User's left arm = MediaPipe right side (after flip)
        wrist = landmarks[_MP_R_WRIST]
        shoulder = landmarks[_MP_R_SHOULDER]
    # "Forward" = wrist y is above (less than) shoulder y in image coords
    return wrist["y"] < shoulder["y"]


# ---------- Main Analyzer ----------
def analyze_marching_in_place(landmarks, state=None):
    """
    March in Place exercise analyzer.

    State machine phases:
        WAITING       -> waiting for body to be visible
        STABILIZING   -> confirming standing posture (1.5 s)
        NEUTRAL       -> standing, waiting for a knee lift
        LEFT_KNEE_UP  -> user's LEFT knee is lifted
        RIGHT_KNEE_UP -> user's RIGHT knee is lifted
        COMPLETED     -> target reps achieved

    One full rep = both legs lifted once (left + right or right + left).
    We track half-reps internally: every 2 valid half-reps = 1 full rep.

    NOTE: "left"/"right" in state/instructions = user's actual side, NOT MediaPipe side.
    """
    now = time.time()
    state = state or {}

    state.setdefault("phase", "WAITING")
    state.setdefault("reps", 0)
    state.setdefault("half_reps", 0)
    state.setdefault("last_side", None)          # user's last knee that was lifted
    state.setdefault("stabilize_start", None)
    state.setdefault("smoothed_angle_l", 0.0)    # user's LEFT knee angle (smoothed)
    state.setdefault("smoothed_angle_r", 0.0)    # user's RIGHT knee angle (smoothed)
    state.setdefault("smoothed_torso", 0.0)
    state.setdefault("coordination_ok", True)

    def result(instruction, progress=None):
        if progress is None:
            progress = state["reps"] / TARGET_REPS
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": state["reps"] >= TARGET_REPS,
            "reps": state["reps"],
        }

    if state.get("phase") == "COMPLETED":
        return result("Exercise complete!", 1.0)

    if not landmarks:
        state["stabilize_start"] = None
        return result("Stand in front of the camera so your full body is visible", 0)

    if not landmarks_visible(landmarks, REQUIRED_LANDMARKS):
        # Don't reset stabilization after it's done — just skip frame
        if state["phase"] in ("WAITING", "STABILIZING"):
            state["stabilize_start"] = None
            return result("Make sure your full body is visible", 0)
        return result(f"Adjust camera — keep marching")

    # ---------- Extract metrics ----------
    shoulder_mid = avg_point(landmarks, 11, 12)
    hip_mid = avg_point(landmarks, 23, 24)

    # Torso lean
    raw_torso = vertical_angle(shoulder_mid, hip_mid)
    prev_torso = state["smoothed_torso"]
    torso_lean = EMA_ALPHA * prev_torso + (1 - EMA_ALPHA) * raw_torso if prev_torso > 0 else raw_torso
    state["smoothed_torso"] = torso_lean

    # Knee angles (hip-knee-ankle) — lower angle = more bent = knee lifted
    # Remember: MediaPipe left = user's RIGHT (after cv2.flip)
    # User's LEFT knee angle: MP right hip(24), MP right knee(26), MP right ankle(28)
    # User's RIGHT knee angle: MP left hip(23), MP left knee(25), MP left ankle(27)
    raw_angle_user_left = knee_angle(landmarks[_MP_R_HIP], landmarks[_MP_R_KNEE], landmarks[_MP_R_ANKLE])
    raw_angle_user_right = knee_angle(landmarks[_MP_L_HIP], landmarks[_MP_L_KNEE], landmarks[_MP_L_ANKLE])

    prev_l = state["smoothed_angle_l"]
    prev_r = state["smoothed_angle_r"]
    angle_l = EMA_ALPHA * prev_l + (1 - EMA_ALPHA) * raw_angle_user_left if prev_l > 10 else raw_angle_user_left
    angle_r = EMA_ALPHA * prev_r + (1 - EMA_ALPHA) * raw_angle_user_right if prev_r > 10 else raw_angle_user_right
    state["smoothed_angle_l"] = angle_l
    state["smoothed_angle_r"] = angle_r

    # ---------- State machine ----------
    while True:
        phase = state["phase"]

        # Form issues (checked in active phases)
        form_issues = []
        if torso_lean > TORSO_LEAN_MAX and phase not in ("WAITING", "STABILIZING"):
            form_issues.append("Stand tall, engage your core")

        if phase == "WAITING":
            # Both knees should be mostly straight (standing position)
            if angle_l > KNEE_DOWN_ANGLE and angle_r > KNEE_DOWN_ANGLE:
                state["phase"] = "STABILIZING"
                state["stabilize_start"] = now
                continue
            return result("Stand tall with feet hip-width apart")

        if phase == "STABILIZING":
            both_down = angle_l > KNEE_DOWN_ANGLE and angle_r > KNEE_DOWN_ANGLE
            if not both_down:
                state["phase"] = "WAITING"
                state["stabilize_start"] = None
                continue
            elapsed = now - (state["stabilize_start"] or now)
            if elapsed >= STABILIZE_TIME:
                state["phase"] = "NEUTRAL"
                state["stabilize_start"] = None
                continue
            return result("Getting ready… hold still")

        if phase == "NEUTRAL":
            if form_issues:
                return result(form_issues[0])

            # Detect knee lift (lower angle = more bent = lifted)
            left_up = angle_l <= KNEE_LIFT_ANGLE
            right_up = angle_r <= KNEE_LIFT_ANGLE

            if left_up:
                if state["last_side"] is None or state["last_side"] == "right":
                    state["phase"] = "LEFT_KNEE_UP"
                    continue
                else:
                    return result("That's your left leg — lift your right knee")

            if right_up:
                if state["last_side"] == "left":
                    state["phase"] = "RIGHT_KNEE_UP"
                    continue
                else:
                    return result("That's your right leg — lift your left knee")

            # Always tell the user which knee to lift next
            if state["last_side"] is None or state["last_side"] == "right":
                return result("Lift your left knee")
            else:
                return result("Lift your right knee")

        if phase == "LEFT_KNEE_UP":
            if form_issues:
                return result(form_issues[0])

            if angle_l >= KNEE_DOWN_ANGLE:
                # Knee returned down — count half-rep
                state["last_side"] = "left"
                state["half_reps"] += 1
                if state["half_reps"] >= 2:
                    state["reps"] += 1
                    state["half_reps"] = 0
                state["phase"] = "NEUTRAL"

                if state["reps"] >= TARGET_REPS:
                    state["phase"] = "COMPLETED"
                    return result("Exercise complete!", 1.0)
                continue

            # Still up
            if angle_l > KNEE_LIFT_ANGLE:
                return result("Lift your left knee a bit higher")

            return result("Good left knee lift — now lower and switch")

        if phase == "RIGHT_KNEE_UP":
            if form_issues:
                return result(form_issues[0])

            if angle_r >= KNEE_DOWN_ANGLE:
                # Knee returned down — count half-rep
                state["last_side"] = "right"
                state["half_reps"] += 1
                if state["half_reps"] >= 2:
                    state["reps"] += 1
                    state["half_reps"] = 0
                state["phase"] = "NEUTRAL"

                if state["reps"] >= TARGET_REPS:
                    state["phase"] = "COMPLETED"
                    return result("Exercise complete!", 1.0)
                continue

            # Still up
            if angle_r > KNEE_LIFT_ANGLE:
                return result("Lift your right knee a bit higher")

            return result("Good right knee lift — now lower and switch")

        return result("Stand in front of the camera so your full body is visible")