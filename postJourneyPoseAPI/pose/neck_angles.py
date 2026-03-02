import numpy as np
import math

# Landmark indices
NOSE = 1
LEFT_CHEEK = 234
RIGHT_CHEEK = 454
FOREHEAD = 10
CHIN = 152

def compute_yaw_pitch(landmarks, img_w, img_h):
    def pt(i):
        lm = landmarks.landmark[i]
        return np.array([lm.x * img_w, lm.y * img_h])

    nose = pt(NOSE)
    left = pt(LEFT_CHEEK)
    right = pt(RIGHT_CHEEK)
    forehead = pt(FOREHEAD)
    chin = pt(CHIN)

    # Yaw (left/right)
    yaw = (nose[0] - (left[0] + right[0]) / 2) / img_w

    # Pitch (up/down)
    pitch = (nose[1] - (forehead[1] + chin[1]) / 2) / img_h

    return yaw, pitch
