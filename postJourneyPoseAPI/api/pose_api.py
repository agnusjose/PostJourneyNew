from fastapi import APIRouter
from pose.shared_state import STATE

router = APIRouter()

@router.post("/pose/analyze")
def analyze():
    return {
        "instruction": STATE.instruction,
        "progress": STATE.progress,
        "completed": STATE.completed,
    }
