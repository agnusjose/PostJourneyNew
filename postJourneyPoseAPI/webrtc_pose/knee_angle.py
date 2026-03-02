from dataclasses import dataclass
from typing import Optional, Dict

import math

from .config import HIP_INDEX, KNEE_INDEX, ANKLE_INDEX, MIN_VISIBILITY, ANGLE_EMA_ALPHA


def _angle_3pts(a, b, c) -> float:
  """Return the angle ABC in degrees."""
  bax = a["x"] - b["x"]
  bay = a["y"] - b["y"]
  bcx = c["x"] - b["x"]
  bcy = c["y"] - b["y"]

  dot = bax * bcx + bay * bcy
  mag_ba = math.hypot(bax, bay)
  mag_bc = math.hypot(bcx, bcy)
  if mag_ba == 0 or mag_bc == 0:
    return 0.0

  cosine = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
  return math.degrees(math.acos(cosine))


@dataclass
class AngleEMA:
  alpha: float = ANGLE_EMA_ALPHA
  value: Optional[float] = None

  def update(self, sample: float) -> float:
    if self.value is None:
      self.value = sample
    else:
      self.value = self.alpha * sample + (1.0 - self.alpha) * self.value
    return self.value


def compute_knee_angle(landmarks: Dict[int, dict], ema: AngleEMA) -> Optional[float]:
  """Compute smoothed knee angle from full-body landmarks map."""
  hip = landmarks.get(HIP_INDEX)
  knee = landmarks.get(KNEE_INDEX)
  ankle = landmarks.get(ANKLE_INDEX)

  if not hip or not knee or not ankle:
    return None

  if (
      hip.get("visibility", 0.0) < MIN_VISIBILITY
      or knee.get("visibility", 0.0) < MIN_VISIBILITY
      or ankle.get("visibility", 0.0) < MIN_VISIBILITY
  ):
    return None

  raw_angle = _angle_3pts(hip, knee, ankle)
  return ema.update(raw_angle)

