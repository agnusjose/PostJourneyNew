import {
    RTCPeerConnection,
    RTCSessionDescription,
    mediaDevices,
} from "react-native-webrtc";
import { POSE_API_BASE_URL } from "./apiConfig";

// Dedicated WebRTC client for seated knee extension with a DataChannel-based
// feedback path. This does NOT affect the existing /offer + /status flow.

let pc = null;
let activeStream = null;
let feedbackChannel = null;

async function destroyExisting() {
    if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
        activeStream = null;
    }
    if (pc) {
        try {
            pc.oniceconnectionstatechange = null;
            pc.onconnectionstatechange = null;
            pc.onicegatheringstatechange = null;
            pc.ontrack = null;
            pc.close();
        } catch {
            // best-effort
        }
        pc = null;
        feedbackChannel = null;
    }
}

/**
 * Start a knee-extension-specific WebRTC session using a DataChannel named
 * "pose-feedback" for real-time JSON feedback.
 *
 * @param {Function} onFeedback  Called with parsed JSON payloads from backend.
 * @param {Function} onStream    Called with the local MediaStream for preview.
 * @returns {Promise<Function>}  stop() function to tear down the session.
 */
export async function startKneeExtensionSession(onFeedback, onStream) {
    await destroyExisting();

    // 1. Acquire camera stream (640x480 @ ~15fps)
    const stream = await mediaDevices.getUserMedia({
        video: {
            facingMode: "user",
            width: 640,
            height: 480,
            frameRate: 15,
        },
        audio: false,
    });
    activeStream = stream;

    if (onStream) onStream(stream);

    // 2. Create RTCPeerConnection
    pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // 3. Add tracks
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // 4. Create DataChannel for pose feedback
    feedbackChannel = pc.createDataChannel("pose-feedback");
    if (feedbackChannel) {
        feedbackChannel.onmessage = (event) => {
            if (!onFeedback) return;
            try {
                const payload = JSON.parse(event.data);
                onFeedback(payload);
            } catch {
                // Ignore malformed messages
            }
        };
    }

    // 5. ICE & SDP negotiation
    const offerDesc = await pc.createOffer();
    await pc.setLocalDescription(offerDesc);

    await new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") {
            resolve();
            return;
        }
        const timeout = setTimeout(() => resolve(), 5000);
        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") {
                clearTimeout(timeout);
                resolve();
            }
        };
    });

    // 6. Send SDP offer to dedicated knee-extension signaling endpoint
    const res = await fetch(`${POSE_API_BASE_URL}/webrtc_pose/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sdp: pc.localDescription.sdp,
            type: pc.localDescription.type,
            exercise: "seated_knee_extension",
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        await destroyExisting();
        throw new Error(`Knee extension signaling failed: ${res.status} ${text}`);
    }

    const answer = await res.json();
    await pc.setRemoteDescription(new RTCSessionDescription(answer));

    const stop = async () => {
        await destroyExisting();
    };

    return stop;
}

