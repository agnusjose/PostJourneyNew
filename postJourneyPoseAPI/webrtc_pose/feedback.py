from typing import Dict, Optional

from .state_machine import REST, STABILIZING, SEATED, EXTENDING, HOLD, LOWERING


def build_feedback(
    angle: Optional[float],
    state: str,
    reps: int,
    confidence: float,
) -> Dict:
  """Create the JSON feedback payload sent over the DataChannel."""
  msg = "Position yourself in front of the camera."

  if state == STABILIZING:
    msg = "Getting ready… hold still."
  elif state == SEATED:
    if reps > 0:
      msg = "Good rep! Straighten your knee again."
    else:
      msg = "You're seated. Straighten one knee to begin."
  elif state == EXTENDING:
    if angle is not None and angle < 130:
      msg = "Straighten your knee further."
    else:
      msg = "Good — keep extending."
  elif state == HOLD:
    msg = "Hold… good control."
  elif state == LOWERING:
    msg = "Lower slowly back to sitting."
  elif state == REST:
    msg = "Sit flat on a chair with knees bent."

  return {
    "knee_angle": float(angle) if angle is not None else None,
    "state": state,
    "reps": int(reps),
    "message": msg,
    "confidence": float(confidence),
  }
