from fastapi import FastAPI
from pydantic import BaseModel
from exercises.neck_mobility import analyze_neck_mobility

app = FastAPI()

class ImagePayload(BaseModel):
    image: str
    exercise: str
    state: dict

@app.post("/pose/analyze")
def analyze_pose(payload: ImagePayload):
    if payload.exercise == "neck_mobility":
        return analyze_neck_mobility(payload.image, payload.state)

    return {
        "instruction": "Exercise not supported",
        "completed": False
    }
