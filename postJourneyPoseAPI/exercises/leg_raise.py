import numpy as np
import math

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

# ---------- Leg Raise Evaluation ----------
def analyze_leg_raise(landmarks, state=None):
    state = state or {"state": "IDLE", "last_angle": None}
    
    HIP, KNEE, ANKLE = 23, 25, 27

    for i in [HIP, KNEE, ANKLE]:
        if landmarks[i]["visibility"] < 0.7:
            state["state"] = "IDLE"
            return {
                "instruction": "Align your full leg in view",
                "progress": 0,
                "state": state,
                "completed": False
            }

    hip = landmarks[HIP]
    knee = landmarks[KNEE]
    ankle = landmarks[ANKLE]

    knee_angle = angle_3pts(hip, knee, ankle)
    if knee_angle < 160:
        return {
            "instruction": "Keep your leg straight",
            "progress": 0,
            "state": state,
            "completed": False
        }

    angle = leg_raise_angle(hip, ankle)
    last = state.get("last_angle")
    state["last_angle"] = angle

    if state["state"] == "IDLE":
        state["state"] = "READY"
        return {
            "instruction": "Ready. Begin lifting your leg",
            "progress": 0.1,
            "state": state,
            "completed": False
        }

    if state["state"] == "READY" and angle > 15:
        state["state"] = "RAISING"

    if state["state"] == "RAISING":
        if angle < 15:
            return {
                "instruction": "Lift your leg higher",
                "progress": 0.2,
                "state": state,
                "completed": False
            }
        if 25 <= angle <= 60:
            state["state"] = "HOLD"
            return {
                "instruction": "Good lift, hold steady",
                "progress": 0.5,
                "state": state,
                "completed": False
            }

    if state["state"] == "HOLD":
        if angle > 65:
            return {
                "instruction": "Lower slowly, avoid over-raising",
                "progress": 0.6,
                "state": state,
                "completed": False
            }
        if last and angle < last - 5:
            state["state"] = "LOWERING"

    if state["state"] == "LOWERING":
        if angle < 20:
            state["state"] = "READY"
            return {
                "instruction": "Good. Repetition completed",
                "progress": 1.0,
                "state": state,
                "completed": True
            }

    return {
        "instruction": "Continue movement",
        "progress": 0.5,
        "state": state,
        "completed": False
    }