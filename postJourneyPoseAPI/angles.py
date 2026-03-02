import math

def torso_rotation(landmarks):
    LS, RS = landmarks[11], landmarks[12]
    LH, RH = landmarks[23], landmarks[24]

    shoulder_mid = (
        (LS["x"] + RS["x"]) / 2,
        (LS["y"] + RS["y"]) / 2,
    )
    hip_mid = (
        (LH["x"] + RH["x"]) / 2,
        (LH["y"] + RH["y"]) / 2,
    )

    dx = shoulder_mid[0] - hip_mid[0]
    dy = shoulder_mid[1] - hip_mid[1]

    return abs(math.degrees(math.atan2(dx, dy)))
