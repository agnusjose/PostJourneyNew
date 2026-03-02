import {
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
} from "react-native-webrtc";
import { POSE_API_BASE_URL } from "./apiConfig";

// Module-level refs — always nulled out before any new allocation
let pc = null;
let activeStream = null;

/**
 * Tear down any live session – stops camera, frees ICE sockets.
 */
async function destroyExisting() {
  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }
  if (pc) {
    pc.oniceconnectionstatechange = null;
    pc.onconnectionstatechange = null;
    pc.onicegatheringstatechange = null;
    pc.ontrack = null;
    pc.close();
    pc = null;
  }
}

/**
 * Start a WebRTC stream for the given exercise.
 *
 * @param {string}   signalingUrl   Base URL of the FastAPI backend
 * @param {string}   exercise       Exercise key for the backend analyzer
 * @param {Function} onStream       Called IMMEDIATELY when the camera stream is
 *                                  available — before the WebRTC handshake.
 *                                  Receives the MediaStream object.
 * @returns {Function}  async stop function — call on screen unmount
 */
export async function startWebRTCStream(signalingUrl, exercise, onStream) {
  // ── 1. Kill any previously live session ──
  await destroyExisting();

  // ── 2. Acquire camera stream ──
  const stream = await mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      frameRate: 15,
    },
    audio: false,
  });
  activeStream = stream;

  // ── 3. Expose stream to UI IMMEDIATELY (camera preview before handshake) ──
  if (onStream) onStream(stream);

  // ── 4. Create RTCPeerConnection ──
  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.oniceconnectionstatechange = () => {
    if (pc) console.log("🧊 ICE connection state:", pc.iceConnectionState);
  };
  pc.onconnectionstatechange = () => {
    if (pc) console.log("🔗 Connection state:", pc.connectionState);
  };

  // ── 5. Add tracks ──
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  // ── 6. Create offer + wait for ICE gathering ──
  const offerDesc = await pc.createOffer();
  await pc.setLocalDescription(offerDesc);

  await new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      console.log("⏱️ ICE gathering timed out — sending offer anyway");
      resolve();
    }, 5000);

    pc.onicegatheringstatechange = () => {
      console.log("🧊 ICE gathering state:", pc.iceGatheringState);
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    };
  });

  console.log("📤 Sending offer for:", exercise);

  // ── 7. Exchange SDP with backend ──
  try {
    const res = await fetch(`${signalingUrl}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sdp: pc.localDescription.sdp,
        type: pc.localDescription.type,
        exercise,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Signaling failed: ${res.status} ${errorText}`);
    }

    const answer = await res.json();
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("✅ WebRTC answer received — connection establishing...");
  } catch (err) {
    await destroyExisting();
    throw err;
  }

  // ── 8. Return stop function ──
  const stopFunc = async () => {
    console.log("🛑 stopFunc called — destroying session");
    await destroyExisting();
  };

  return stopFunc;
}
