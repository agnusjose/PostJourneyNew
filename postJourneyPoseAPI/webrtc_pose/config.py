import os

ENABLE_SEATED_KNEE_EXTENSION = (
    os.getenv("ENABLE_SEATED_KNEE_EXTENSION", "true").lower() == "true"
)

# Target processing rate (max frames per second)
MAX_FPS = 15.0

# Minimum landmark visibility to trust a point
MIN_VISIBILITY = 0.5

# EMA smoothing factor for knee angle
ANGLE_EMA_ALPHA = 0.4

# MediaPipe indices (left leg by default)
HIP_INDEX = 23
KNEE_INDEX = 25
ANKLE_INDEX = 27

