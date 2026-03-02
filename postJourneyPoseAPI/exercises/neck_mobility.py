import cv2
import mediapipe as mp
import time
import base64
import numpy as np
from collections import deque

# ---------- MediaPipe ----------
mp_face = mp.solutions.face_mesh
face_mesh = mp_face.FaceMesh(
    static_image_mode=False,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

mp_pose = mp.solutions.pose
pose_model = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# ---------- Constants ----------
HOLD_TIME = 3.0
TARGET_CYCLES = 5
YAW_THRESHOLD = 0.03
PITCH_THRESHOLD = 0.02
NEUTRAL_EPS = 0.015
SMOOTH_WINDOW = 5
VISIBILITY_FRAMES = 10

# Sequence: flexion → extension → rotate left → rotate right (with neutral between)
SEQUENCE = [
    ("down",    "Lower chin to chest"),
    ("neutral", "Return to center"),
    ("up",      "Look up slowly"),
    ("neutral", "Return to center"),
    ("left",    "Turn head left"),
    ("neutral", "Return to center"),
    ("right",   "Turn head right"),
    ("neutral", "Return to center"),
]


# ---------- Helpers ----------
def detect_direction(yaw, pitch, baseline):
    """
    Based on observed data:
      User turns LEFT  → dy positive  (+0.10 to +0.17)
      User turns RIGHT → dy negative
      Chin down        → dp positive  (+0.05 to +0.07)
      Look up          → dp negative  (-0.05 to -0.07)
    """
    dy = yaw - baseline["yaw"]
    dp = pitch - baseline["pitch"]

    abs_dy = abs(dy)
    abs_dp = abs(dp)

    # Neutral check — generous zone
    if abs_dy < NEUTRAL_EPS and abs_dp < NEUTRAL_EPS:
        return "neutral"

    # Give yaw 2x weight in comparison (ear asymmetry has smaller scale)
    weighted_dy = abs_dy * 2.0

    # Pick the dominant axis
    if weighted_dy > abs_dp and abs_dy > YAW_THRESHOLD:
        return "right" if dy > 0 else "left"
    if abs_dp > PITCH_THRESHOLD:
        return "down" if dp > 0 else "up"
    if abs_dy > YAW_THRESHOLD:
        return "right" if dy > 0 else "left"

    return "invalid"


def decode_base64_image(image_b64):
    data = base64.b64decode(image_b64)
    arr = np.frombuffer(data, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


# ---------- Main Analyzer ----------
def analyze_neck_mobility(image_b64=None, frame_bgr=None, state=None, expected=None):
    now = time.time()

    if frame_bgr is None and image_b64 is not None:
        frame_bgr = decode_base64_image(image_b64)
    if frame_bgr is None:
        return {
            "instruction": "Camera input not available",
            "progress": 0,
            "state": state or {},
        }

    # ----- State init -----
    state = state or {}
    state.setdefault("phase", "visibility")
    state.setdefault("baseline", None)
    state.setdefault("step", 0)
    state.setdefault("hold_start", None)
    state.setdefault("reps", 0)
    state.setdefault("history", deque(maxlen=SMOOTH_WINDOW))
    state.setdefault("visible_frames", 0)
    state.setdefault("last_hold_msg", "")
    state.setdefault("landmarks_33", None)

    def _result(instruction, progress=None, completed=False):
        if progress is None:
            cycle_progress = state["step"] / len(SEQUENCE)
            progress = (state["reps"] + cycle_progress) / TARGET_CYCLES
        r = {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "completed": completed,
            "reps": state["reps"],
            "current_state": f"step_{state['step']}",
            "state": state,
        }
        return r

    # ── Completed ──
    if state["reps"] >= TARGET_CYCLES:
        return _result("Exercise complete!", 1.0, True)

    # ----- Extract pose landmarks for overlay -----
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    pose_results = pose_model.process(rgb)
    if pose_results.pose_landmarks:
        state["landmarks_33"] = [
            {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
            for lm in pose_results.pose_landmarks.landmark
        ]

    # ----- Face detection -----
    res = face_mesh.process(rgb)

    if not res.multi_face_landmarks:
        state["visible_frames"] = 0
        state["hold_start"] = None
        return _result("Face and neck must be visible")

    state["visible_frames"] += 1
    if state["visible_frames"] < VISIBILITY_FRAMES:
        return _result("Hold steady, calibrating")

    lm = res.multi_face_landmarks[0].landmark
    nose_face = lm[1]
    # FaceMesh ear tragion landmarks (reliable even during rotation)
    left_ear_fm = lm[234]   # left tragion
    right_ear_fm = lm[454]  # right tragion

    # ── YAW: ear asymmetry (works perfectly for head rotation) ──
    # nose_to_left = how far nose is from left ear
    # nose_to_right = how far nose is from right ear
    # When centered: roughly equal.  When turning: they diverge.
    nose_to_left = abs(nose_face.x - left_ear_fm.x)
    nose_to_right = abs(right_ear_fm.x - nose_face.x)
    # positive = nose closer to right ear = user turned right (in mirrored image = user's LEFT)
    yaw = nose_to_right - nose_to_left

    # ── PITCH: nose.y relative to shoulder midpoint (up/down) ──
    if state.get("landmarks_33") and len(state["landmarks_33"]) > 12:
        l_sh = state["landmarks_33"][11]
        r_sh = state["landmarks_33"][12]
        sh_mid_y = (l_sh["y"] + r_sh["y"]) / 2.0
        pitch = nose_face.y - sh_mid_y
    else:
        chin = lm[152]
        pitch = chin.y - nose_face.y

    state["history"].append((yaw, pitch))
    yaw = sum(v[0] for v in state["history"]) / len(state["history"])
    pitch = sum(v[1] for v in state["history"]) / len(state["history"])

    # ----- Calibration -----
    if state["baseline"] is None:
        detected = detect_direction(yaw, pitch, {"yaw": yaw, "pitch": pitch})
        if detected != "neutral":
            state["hold_start"] = None
            return _result("Sit straight, hold steady")

        if state["hold_start"] is None:
            state["hold_start"] = now
        if now - state["hold_start"] < HOLD_TIME:
            return _result("Calibrating posture")

        state["baseline"] = {"yaw": yaw, "pitch": pitch}
        state["hold_start"] = None
        state["phase"] = "active"
        return _result(SEQUENCE[0][1])

    # ----- Active Exercise -----
    expected_dir, text = SEQUENCE[state["step"]]
    detected = detect_direction(yaw, pitch, state["baseline"])
    dy = yaw - state["baseline"]["yaw"]
    dp = pitch - state["baseline"]["pitch"]
    print(f"🧭 NECK: yaw={yaw:.4f} pitch={pitch:.4f} dy={dy:.4f} dp={dp:.4f} detected={detected} expected={expected_dir}")

    if detected == expected_dir:
        if state["hold_start"] is None:
            state["hold_start"] = now

        elapsed = now - state["hold_start"]

        if elapsed >= HOLD_TIME:
            state["hold_start"] = None
            state["step"] += 1

            if state["step"] >= len(SEQUENCE):
                state["step"] = 0
                state["reps"] += 1
                if state["reps"] >= TARGET_CYCLES:
                    return _result("Exercise complete!", 1.0, True)
                return _result(f"Cycle {state['reps']} done! Continue")

            return _result(SEQUENCE[state["step"]][1])

        secs_left = int(HOLD_TIME - elapsed)
        msg = f"{text}, {secs_left}s"
        if msg != state.get("last_hold_msg", ""):
            state["last_hold_msg"] = msg
            return _result(msg)
        return _result(state["last_hold_msg"])

    # ----- Wrong position -----
    state["hold_start"] = None
    return _result(text)
