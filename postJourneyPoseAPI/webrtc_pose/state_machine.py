from dataclasses import dataclass, field
from typing import Tuple


REST = "REST"
STABILIZING = "STABILIZING"
SEATED = "SEATED"
EXTENDING = "EXTENDING"
HOLD = "HOLD"
LOWERING = "LOWERING"

STABILIZE_TIME = 1.5  # seconds to hold seated position before exercise starts


@dataclass
class KneeExtensionStateMachine:
  """
  Deterministic state machine for seated knee extension.

  States:
    REST -> STABILIZING -> SEATED -> EXTENDING -> HOLD -> LOWERING -> SEATED
  """

  state: str = REST
  reps: int = 0
  hold_start_ts: float = 0.0
  stabilize_start_ts: float = 0.0

  def reset(self) -> None:
    self.state = REST
    self.reps = 0
    self.hold_start_ts = 0.0
    self.stabilize_start_ts = 0.0

  def update(self, angle: float, t: float) -> Tuple[str, int]:
    """
    Update machine given current knee angle (degrees) and timestamp (seconds).
    Returns (state, reps).
    """
    # Guard against nonsense
    if angle is None:
      self.state = REST
      self.stabilize_start_ts = 0.0
      return self.state, self.reps

    # Transition logic
    if self.state == REST:
      if angle <= 110.0:
        # User's knee is bent — potentially sitting down
        self.state = STABILIZING
        self.stabilize_start_ts = t

    elif self.state == STABILIZING:
      if angle > 110.0:
        # Knee straightened again — user is still adjusting, not seated yet
        self.state = REST
        self.stabilize_start_ts = 0.0
      elif t - self.stabilize_start_ts >= STABILIZE_TIME:
        # Held seated position long enough — ready to exercise
        self.state = SEATED
        self.stabilize_start_ts = 0.0

    elif self.state == SEATED:
      if angle > 130.0:
        # Intentional extension (use higher threshold to avoid false starts)
        self.state = EXTENDING

    elif self.state == EXTENDING:
      if angle >= 160.0:
        self.state = HOLD
        self.hold_start_ts = t
      elif angle <= 100.0:
        # Fell back down before full extension
        self.state = SEATED

    elif self.state == HOLD:
      if angle < 150.0:
        # Dropped below hold threshold
        self.state = LOWERING
      else:
        # Stay in HOLD while angle stays high; rep completion handled in LOWERING
        pass

    elif self.state == LOWERING:
      if angle <= 100.0:
        # Only count rep when we returned fully to seated after a valid hold
        if self.hold_start_ts > 0:
          self.reps += 1
        self.state = SEATED
        self.hold_start_ts = 0.0

    return self.state, self.reps
