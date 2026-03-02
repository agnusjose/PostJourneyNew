import time
import math

PHASES = [
    {"name": "Clockwise Circles",        "duration": 30, "instruction": "Swing your arm in small clockwise circles"},
    {"name": "Counterclockwise Circles",  "duration": 30, "instruction": "Now swing in counterclockwise circles"},
    {"name": "Forward-Backward Swings",   "duration": 30, "instruction": "Swing your arm forward and backward like a pendulum"},
]
TOTAL_PHASES = len(PHASES)
REST_BETWEEN = 3
WRIST_HISTORY_MAX = 40
MOTION_THRESHOLD = 0.015
CIRCLE_CHECK_WINDOW = 25
MIN_VIS = 0.15

_L_SHOULDER = 11
_R_SHOULDER = 12
_L_WRIST = 15
_R_WRIST = 16
_L_HIP = 23
_R_HIP = 24


def body_visible(landmarks):
    if not landmarks or len(landmarks) < 17:
        return False
    shoulder_ok = (landmarks[_L_SHOULDER]["visibility"] > MIN_VIS or
                   landmarks[_R_SHOULDER]["visibility"] > MIN_VIS)
    hip_ok = (landmarks[_L_HIP]["visibility"] > MIN_VIS or
              landmarks[_R_HIP]["visibility"] > MIN_VIS)
    return shoulder_ok and hip_ok


def get_hanging_wrist(landmarks):
    candidates = []
    if landmarks[_L_WRIST]["visibility"] > MIN_VIS:
        candidates.append((landmarks[_L_WRIST], "left"))
    if landmarks[_R_WRIST]["visibility"] > MIN_VIS:
        candidates.append((landmarks[_R_WRIST], "right"))
    if not candidates:
        return None
    return max(candidates, key=lambda c: c[0]["y"])


def compute_motion(history):
    if len(history) < 3:
        return 0
    total_dist = 0
    for i in range(1, len(history)):
        dx = history[i][0] - history[i-1][0]
        dy = history[i][1] - history[i-1][1]
        total_dist += math.sqrt(dx*dx + dy*dy)
    return total_dist / len(history)


def detect_circular_motion(history):
    if len(history) < CIRCLE_CHECK_WINDOW:
        return "still"

    recent = history[-CIRCLE_CHECK_WINDOW:]
    cross_products = []

    for i in range(2, len(recent)):
        dx1 = recent[i-1][0] - recent[i-2][0]
        dy1 = recent[i-1][1] - recent[i-2][1]
        dx2 = recent[i][0] - recent[i-1][0]
        dy2 = recent[i][1] - recent[i-1][1]
        cross = dx1 * dy2 - dy1 * dx2
        if abs(cross) > 1e-6:
            cross_products.append(cross)

    if len(cross_products) < 5:
        return "still"

    positive = sum(1 for c in cross_products if c > 0)
    negative = sum(1 for c in cross_products if c < 0)
    total = positive + negative

    if total == 0:
        return "still"
    if positive / total > 0.7:
        return "clockwise"
    elif negative / total > 0.7:
        return "counterclockwise"

    if compute_motion(recent) > MOTION_THRESHOLD:
        return "linear"
    return "still"


def detect_swing_axis(history):
    if len(history) < 10:
        return "unknown"
    recent = history[-15:]
    total_dx = 0
    total_dy = 0
    for i in range(1, len(recent)):
        total_dx += abs(recent[i][0] - recent[i-1][0])
        total_dy += abs(recent[i][1] - recent[i-1][1])
    if total_dx + total_dy < 0.01:
        return "unknown"
    if total_dy > total_dx * 1.3:
        return "forward_back"
    elif total_dx > total_dy * 1.3:
        return "side_to_side"
    return "mixed"


def analyze_pendulum_exercise(landmarks, state=None):
    now = time.time()
    state = state or {}

    state.setdefault("phase", "SETUP")
    state.setdefault("phase_index", 0)
    state.setdefault("phase_start", None)
    state.setdefault("rest_start", None)
    state.setdefault("body_confirmed", 0)
    state.setdefault("wrist_history", [])
    state.setdefault("active_time", 0.0)
    state.setdefault("last_active", None)

    completed = state["phase_index"]

    def result(instruction, progress=None):
        if progress is None:
            progress = completed / TOTAL_PHASES
        return {
            "instruction": instruction,
            "progress": min(progress, 1.0),
            "state": state,
            "completed": completed >= TOTAL_PHASES,
            "reps": completed,
        }

    if state.get("phase") == "COMPLETED":
        return result("Exercise complete!", 1.0)

    if not body_visible(landmarks):
        state["last_active"] = None
        if state["phase"] == "EXERCISING":
            return result("Step back into frame — I need to see your upper body")
        return result("Stand beside a table for support, lean forward", 0)

    wrist_data = get_hanging_wrist(landmarks)
    if wrist_data:
        wrist, side = wrist_data
        history = state["wrist_history"]
        history.append((wrist["x"], wrist["y"]))
        if len(history) > WRIST_HISTORY_MAX:
            state["wrist_history"] = history[-WRIST_HISTORY_MAX:]

    phase = state["phase"]

    if phase == "SETUP":
        state["body_confirmed"] += 1
        if state["body_confirmed"] >= 8:
            state["phase"] = "EXERCISING"
            state["phase_start"] = now
            state["active_time"] = 0
            return result(f"Phase 1/{TOTAL_PHASES}: {PHASES[0]['instruction']}")
        return result("Stand beside a table, lean forward, let your arm hang")

    if phase == "REST":
        elapsed = now - (state["rest_start"] or now)
        if elapsed >= REST_BETWEEN:
            idx = state["phase_index"]
            state["phase"] = "EXERCISING"
            state["phase_start"] = now
            state["active_time"] = 0
            state["wrist_history"] = []
            return result(f"Phase {idx+1}/{TOTAL_PHASES}: {PHASES[idx]['instruction']}")
        return result(f"Rest — next phase in {int(REST_BETWEEN - elapsed) + 1}s")

    if phase == "EXERCISING":
        idx = state["phase_index"]
        ph = PHASES[idx]
        elapsed = now - (state["phase_start"] or now)

        motion_type = detect_circular_motion(state["wrist_history"])
        avg_motion = compute_motion(state["wrist_history"])

        if avg_motion > MOTION_THRESHOLD:
            if state["last_active"] is not None:
                state["active_time"] += now - state["last_active"]
            state["last_active"] = now
        else:
            state["last_active"] = None

        if elapsed >= ph["duration"]:
            state["phase_index"] += 1
            completed = state["phase_index"]
            if completed >= TOTAL_PHASES:
                state["phase"] = "COMPLETED"
                return result("Exercise complete!", 1.0)
            state["phase"] = "REST"
            state["rest_start"] = now
            state["wrist_history"] = []
            return result(f"{ph['name']} done! Relax for a moment")

        remaining = int(ph["duration"] - elapsed)

        if avg_motion < MOTION_THRESHOLD:
            return result(f"Keep swinging — your arm should be moving ({remaining}s)")

        if idx == 0:
            if motion_type == "counterclockwise":
                return result(f"Other direction — swing clockwise ({remaining}s)")
            if motion_type == "clockwise":
                return result(f"Good clockwise circles! ({remaining}s)")
            return result(f"Make small circular motions — clockwise ({remaining}s)")

        if idx == 1:
            if motion_type == "clockwise":
                return result(f"Other direction — swing counterclockwise ({remaining}s)")
            if motion_type == "counterclockwise":
                return result(f"Good counterclockwise circles! ({remaining}s)")
            return result(f"Make small circular motions — counterclockwise ({remaining}s)")

        if idx == 2:
            if motion_type in ("clockwise", "counterclockwise"):
                return result(f"Straight swings now — forward and back ({remaining}s)")
            swing_dir = detect_swing_axis(state["wrist_history"])
            if swing_dir == "side_to_side":
                return result(f"Swing forward and back, not side to side ({remaining}s)")
            return result(f"Good pendulum swings! ({remaining}s)")

    if phase == "COMPLETED":
        return result("Exercise complete!", 1.0)

    return result("Position yourself in front of the camera")