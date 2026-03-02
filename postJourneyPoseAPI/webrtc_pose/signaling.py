import asyncio
from dataclasses import dataclass
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from aiortc import RTCPeerConnection, RTCSessionDescription

from .config import ENABLE_SEATED_KNEE_EXTENSION
from .peer import KneeVideoTrackProcessor


router = APIRouter(prefix="/webrtc_pose", tags=["webrtc_pose"])


class OfferPayload(BaseModel):
  sdp: str
  type: str
  exercise: Optional[str] = "seated_knee_extension"


@dataclass
class KneeSession:
  pc: RTCPeerConnection
  processor: Optional[KneeVideoTrackProcessor] = None
  latest_landmarks: Optional[list] = None


active_session: Optional[KneeSession] = None
active_lock = asyncio.Lock()


@router.get("/status")
async def knee_status():
    """Return latest landmarks for skeleton overlay."""
    async with active_lock:
        if active_session is None or active_session.latest_landmarks is None:
            return {"landmarks": None}
        return {"landmarks": active_session.latest_landmarks}


@router.post("/offer")
async def handle_offer(payload: OfferPayload):
  """
  Signaling entrypoint for seated knee extension.

  Accepts a WebRTC SDP offer and returns an SDP answer. Video frames are
  processed server-side and feedback is streamed back over a DataChannel
  named "pose-feedback".
  """
  if not ENABLE_SEATED_KNEE_EXTENSION:
    raise HTTPException(status_code=503, detail="Seated knee extension disabled by config")

  global active_session

  async with active_lock:
    # Tear down any existing session to keep things restart-safe
    if active_session is not None:
      try:
        await active_session.pc.close()
      except Exception:
        pass
      active_session = None

    pc = RTCPeerConnection()
    session = KneeSession(pc=pc)

    data_channels = {}

    @pc.on("datachannel")
    def on_datachannel(channel):
      data_channels[channel.label] = channel

    @pc.on("track")
    def on_track(track):
      if track.kind != "video":
        return
      processor = KneeVideoTrackProcessor(track, pc, session=session)
      session.processor = processor
      processor.start()

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
      if pc.connectionState in ("failed", "closed", "disconnected"):
        async with active_lock:
          if active_session is session:
            try:
              await pc.close()
            except Exception:
              pass
            active_session = None

    offer = RTCSessionDescription(sdp=payload.sdp, type=payload.type)
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    active_session = session

    return {
      "sdp": pc.localDescription.sdp,
      "type": pc.localDescription.type,
    }

