from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
import cv2
import numpy as np
import mediapipe as mp
import math
import time

from exercises.neck_mobility import analyze_neck_mobility

app = FastAPI(title="PostJourney Pose API")

# ---------- MediaPipe Pose ----------
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    enable_segmentation=False,
    min_detection_confidence=0.5
)

# ---------- Request schema ----------
class FramePayload(BaseModel):
    image: str
    exercise: str
    state: dict | None = None   # 👈 needed for neck mobility


# ---------- Session State (LEG RAISE ONLY) ----------
SESSION = {
    "state": "IDLE",
    "last_angle": None,
    "last_feedback_time": 0
}

FEEDBACK_COOLDOWN = 1.5  # seconds


# ---------- Utils ----------
def decode_base64_image(base64_str):
    try:
        img_bytes = base64.b64decode(base64_str)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception:
        return None


def extract_landmarks(results):
    return [
        {
            "x": lm.x,
            "y": lm.y,
            "z": lm.z,
            "visibility": lm.visibility
        }
        for lm in results.pose_landmarks.landmark
    ]


# ---------- Geometry ----------
def angle_3pts(a, b, c):
    ba = np.array([a["x"] - b["x"], a["y"] - b["y"]])
    bc = np.array([c["x"] - b["x"], c["y"] - b["y"]])
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    return np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))


def leg_raise_angle(hip, ankle):
    dx = ankle["x"] - hip["x"]
    dy = hip["y"] - ankle["y"]
    return abs(math.degrees(math.atan2(dy, dx)))


# ---------- Leg Raise Evaluation ----------
def evaluate_leg_raise(landmarks):
    HIP, KNEE, ANKLE = 23, 25, 27

    for i in [HIP, KNEE, ANKLE]:
        if landmarks[i]["visibility"] < 0.7:
            SESSION["state"] = "IDLE"
            return {
                "detected": True,
                "valid": False,
                "angle": None,
                "feedback": "Align your full leg in view"
            }

    hip = landmarks[HIP]
    knee = landmarks[KNEE]
    ankle = landmarks[ANKLE]

    knee_angle = angle_3pts(hip, knee, ankle)
    if knee_angle < 160:
        return {
            "detected": True,
            "valid": False,
            "angle": round(knee_angle, 1),
            "feedback": "Keep your leg straight"
        }

    angle = leg_raise_angle(hip, ankle)
    last = SESSION["last_angle"]
    SESSION["last_angle"] = angle

    if SESSION["state"] == "IDLE":
        SESSION["state"] = "READY"
        return {
            "detected": True,
            "valid": True,
            "angle": round(angle, 1),
            "feedback": "Ready. Begin lifting your leg"
        }

    if SESSION["state"] == "READY" and angle > 15:
        SESSION["state"] = "RAISING"

    if SESSION["state"] == "RAISING":
        if angle < 15:
            return {
                "detected": True,
                "valid": True,
                "angle": round(angle, 1),
                "feedback": "Lift your leg higher"
            }
        if 25 <= angle <= 60:
            SESSION["state"] = "HOLD"
            return {
                "detected": True,
                "valid": True,
                "angle": round(angle, 1),
                "feedback": "Good lift, hold steady"
            }

    if SESSION["state"] == "HOLD":
        if angle > 65:
            return {
                "detected": True,
                "valid": False,
                "angle": round(angle, 1),
                "feedback": "Lower slowly, avoid over-raising"
            }
        if last and angle < last - 5:
            SESSION["state"] = "LOWERING"

    if SESSION["state"] == "LOWERING":
        if angle < 20:
            SESSION["state"] = "READY"
            return {
                "detected": True,
                "valid": True,
                "angle": round(angle, 1),
                "feedback": "Good. Prepare for next repetition"
            }

    return {
        "detected": True,
        "valid": True,
        "angle": round(angle, 1),
        "feedback": None
    }


# ---------- API ----------
@app.post("/pose/analyze")
def analyze_pose(payload: FramePayload):
    image = decode_base64_image(payload.image)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    # 👇 NECK MOBILITY (NO POSE MODEL NEEDED)
    if payload.exercise == "neck_mobility":
        return analyze_neck_mobility(
            payload.image,
            payload.state or {}
        )

    # 👇 POSE-BASED EXERCISES
    results = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    if not results.pose_landmarks:
        SESSION["state"] = "IDLE"
        return {
            "detected": False,
            "feedback": "No body detected",
            "angle": None,
            "valid": False
        }

    landmarks = extract_landmarks(results)

    if payload.exercise == "leg_raise":
        return evaluate_leg_raise(landmarks)

    return {
        "detected": True,
        "valid": False,
        "angle": None,
        "feedback": "Exercise not supported"
    }


@app.get("/")
def health():
    return {"status": "PostJourney Pose API running"}
