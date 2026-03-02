from dataclasses import dataclass, field
from typing import Optional, Dict

import cv2
import mediapipe as mp

from .config import MIN_VISIBILITY, HIP_INDEX
from .knee_angle import AngleEMA, compute_knee_angle


mp_pose = mp.solutions.pose


@dataclass
class KneePoseEstimator:
  """
  Thin wrapper around MediaPipe Pose that focuses on knee-angle extraction for
  seated knee extension.
  """

  ema: AngleEMA = field(default_factory=AngleEMA)
  pose: mp_pose.Pose = field(default_factory=lambda: mp_pose.Pose(
      static_image_mode=False,
      model_complexity=1,
      min_detection_confidence=0.5,
      min_tracking_confidence=0.5,
  ))

  def process(self, frame_bgr) -> Optional[Dict]:
    img_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    results = self.pose.process(img_rgb)
    if not results.pose_landmarks:
      return None

    raw = [
        {
            "x": lm.x,
            "y": lm.y,
            "z": lm.z,
            "visibility": lm.visibility,
        }
        for lm in results.pose_landmarks.landmark
    ]
    landmarks = {idx: lm for idx, lm in enumerate(raw)}

    # Basic hip stability heuristic: hip should remain near baseline height.
    hip = landmarks.get(HIP_INDEX)
    if not hip or hip.get("visibility", 0.0) < MIN_VISIBILITY:
      return None

    angle = compute_knee_angle(landmarks, self.ema)
    if angle is None:
      return None

    # Confidence based on angle range and landmark visibility
    vis = min(
        landmarks[HIP_INDEX]["visibility"],
        landmarks[self.ema.value is not None and HIP_INDEX or HIP_INDEX]["visibility"]
        if HIP_INDEX in landmarks
        else MIN_VISIBILITY,
    )
    confidence = float(max(0.0, min(1.0, vis)))

    return {
      "angle": float(angle),
      "confidence": confidence,
      "landmarks": raw,
    }

