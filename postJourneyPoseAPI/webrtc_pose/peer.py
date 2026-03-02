import asyncio
from typing import Optional

import cv2
from aiortc import RTCPeerConnection
from aiortc.mediastreams import MediaStreamTrack, MediaStreamError

from .config import MAX_FPS
from .pose_estimator import KneePoseEstimator
from .state_machine import KneeExtensionStateMachine
from .feedback import build_feedback


class KneeVideoTrackProcessor:
  """
  Encapsulates the recv + process loop for a single seated-knee-extension session.
  """

  def __init__(self, track: MediaStreamTrack, rtc_pc: RTCPeerConnection, session=None, data_channel_label: str = "pose-feedback"):
    self._track = track
    self._pc = rtc_pc
    self._session = session
    self._estimator = KneePoseEstimator()
    self._sm = KneeExtensionStateMachine()
    self._data_channel_label = data_channel_label
    self._task: Optional[asyncio.Task] = None

  def start(self) -> None:
    if self._task is None:
      self._task = asyncio.create_task(self._run())

  async def _run(self) -> None:
    dt = 1.0 / MAX_FPS
    last_sent_ts = 0.0

    try:
      while True:
        frame = await self._track.recv()
        try:
          frame_ts = frame.time / 1_000_000 if frame.time is not None else asyncio.get_event_loop().time()
        except Exception:
          frame_ts = asyncio.get_event_loop().time()

        if frame_ts - last_sent_ts < dt:
          continue

        img = frame.to_ndarray(format="bgr24")
        img = cv2.flip(img, 1)

        est = self._estimator.process(img)
        if not est:
          continue

        angle = est["angle"]
        confidence = est["confidence"]

        # Store landmarks for overlay endpoint
        if self._session is not None and "landmarks" in est:
          self._session.latest_landmarks = est["landmarks"]

        state, reps = self._sm.update(angle, frame_ts)
        payload = build_feedback(angle, state, reps, confidence)
        last_sent_ts = frame_ts

        # Send over DataChannel if present
        for dc in self._pc.getTransceivers():
          # Not a data channel
          pass

        for dc in self._pc.sctp.transport.dataChannels if self._pc.sctp and self._pc.sctp.transport else []:
          if dc.label == self._data_channel_label and dc.readyState == "open":
            try:
              dc.send_json(payload)
            except Exception:
              # Non-fatal; continue processing frames
              pass
    except MediaStreamError:
      # Stream ended from client side
      self._sm.reset()
    except asyncio.CancelledError:
      self._sm.reset()
    finally:
      try:
        await self._track.stop()
      except Exception:
        pass

