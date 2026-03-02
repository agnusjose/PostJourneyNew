import time
from .shared_state import STATE

HOLD_TIME = 3.0

SEQUENCE = [
    ("NEUTRAL", "Hold neutral position"),
    ("LEFT", "Move neck to the LEFT and hold"),
    ("NEUTRAL", "Return to neutral and hold"),
    ("RIGHT", "Move neck to the RIGHT and hold"),
    ("NEUTRAL", "Return to neutral and hold"),
    ("UP", "Move neck UP and hold"),
    ("NEUTRAL", "Return to neutral and hold"),
    ("DOWN", "Move neck DOWN and hold"),
]

def classify_position(yaw, pitch):
    if abs(yaw) < 0.03 and abs(pitch) < 0.03:
        return "NEUTRAL"
    if yaw > 0.05:
        return "RIGHT"
    if yaw < -0.05:
        return "LEFT"
    if pitch < -0.05:
        return "UP"
    if pitch > 0.05:
        return "DOWN"
    return "UNKNOWN"

def update_state(yaw, pitch):
    now = time.time()

    if STATE.completed:
        return

    position = classify_position(yaw, pitch)

    if STATE.phase == "WAITING_FOR_VISIBILITY":
        if position != "UNKNOWN":
            STATE.phase = "NEUTRAL"
            STATE.phase_start = now
        STATE.instruction = "Sit straight and align your face"
        return

    expected, instruction = SEQUENCE[STATE.repetitions % len(SEQUENCE)]

    if position == expected:
        elapsed = now - STATE.phase_start
        STATE.progress = min(elapsed / HOLD_TIME, 1.0)
        STATE.instruction = instruction

        if elapsed >= HOLD_TIME:
            STATE.phase_start = now
            STATE.repetitions += 1

            if STATE.repetitions >= len(SEQUENCE):
                STATE.repetitions = 0
                STATE.progress = 0
    else:
        STATE.phase_start = now
        STATE.progress = 0
        STATE.instruction = f"Adjust to {expected} position"
