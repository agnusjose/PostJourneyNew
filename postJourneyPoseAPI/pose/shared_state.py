from dataclasses import dataclass, field
import time

@dataclass
class NeckExerciseState:
    phase: str = "WAITING_FOR_VISIBILITY"
    phase_start: float = field(default_factory=time.time)
    instruction: str = "Sit straight and look at the camera"
    progress: float = 0.0
    repetitions: int = 0
    completed: bool = False

STATE = NeckExerciseState()
