import asyncio
import concurrent.futures
import cv2
import time
import importlib
import json
import os
import traceback
from dataclasses import dataclass, field
from typing import IO, List, Optional, Tuple
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.mediastreams import MediaStreamError
import mediapipe as mp
from webrtc_pose.signaling import router as knee_router

# ---------- MediaPipe Pose (video-optimized, single-thread executor) ----------
# static_image_mode=False: use tracking between frames (faster, lower latency).
# min_detection_confidence / min_tracking_confidence: balance responsiveness vs jitter.
# model_complexity=1: best CPU throughput; 0 is faster but less accurate.
mp_pose = mp.solutions.pose
_pose_model = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# Single-thread executor: Pose is not thread-safe; all inference runs here so event loop is never blocked.
_pose_executor = concurrent.futures.ThreadPoolExecutor(max_workers=1, thread_name_prefix="pose")

app = FastAPI()
app.include_router(knee_router)

# Allow requests from any origin (needed for physical phone access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ⏱️ Frame rate and latency invariants
TARGET_FPS = 15
FRAME_INTERVAL = 1.0 / TARGET_FPS
# If processing exceeds this, we log backlog warning (no frame drop in executor; latest-frame strategy handles backlog)
MAX_PROCESSING_TIME_WARN_MS = 150
RECORD_BATCH_SIZE = 8


# ---------- Per-Session State ----------
@dataclass
class SessionContext:
    """Owns all mutable state for one WebRTC session.

    Lifetime: created when /offer is received, cleaned up when either:
      - a new /offer arrives  (force-kill / restart scenario)
      - connectionstatechange fires failed/closed/disconnected  (graceful close)
      - the server shuts down
    """
    pc: RTCPeerConnection
    exercise: str
    recv_task: Optional[asyncio.Task] = field(default=None)
    pose_state: dict = field(default_factory=dict)
    latest_results: dict = field(default_factory=lambda: {
        "instruction": "Position yourself in front of the camera",
        "progress": 0,
        "completed": False,
        "reps": 0,
    })
    latest_landmarks: Optional[List[dict]] = field(default=None)  # for skeleton overlay
    record_file: Optional[IO] = field(default=None)
    record_buffer: List[dict] = field(default_factory=list)

    async def cleanup(self):
        """Deterministically cancel the recv task, flush the recording file,
        and close the PeerConnection.  Safe to call multiple times.
        """
        # 1. Cancel and await the recv loop
        if self.recv_task is not None and not self.recv_task.done():
            self.recv_task.cancel()
            try:
                await asyncio.wait_for(asyncio.shield(self.recv_task), timeout=2.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass
        self.recv_task = None

        # 2. Allow in-flight executor to finish writing to record_buffer, then flush and close
        if self.record_file is not None:
            try:
                await asyncio.sleep(0.25)
                _flush_record_buffer_sync(self.record_buffer, self.record_file)
                self.record_file.write("]}")
                self.record_file.flush()
                self.record_file.close()
            except Exception:
                pass
            self.record_file = None
        self.record_buffer.clear()

        # 3. Close the PeerConnection (releases ICE/DTLS sockets)
        try:
            await self.pc.close()
        except Exception:
            pass


# ---------- Session Registry ----------
# Single-user model: exactly one active session at a time.
# Protected by a lock so that concurrent /offer requests (unlikely but possible
# on a slow network) do not race against each other.
active_session: Optional[SessionContext] = None
active_session_lock = asyncio.Lock()


# ---------- Recording (buffered, off event loop) ----------
def _flush_record_buffer_sync(buffer: List[dict], file_handle: IO) -> None:
    """Write buffered record entries to file. Call from executor or at cleanup."""
    if not buffer:
        return
    for i, entry in enumerate(buffer):
        if i > 0:
            file_handle.write(",")
        file_handle.write(json.dumps(entry))
    file_handle.flush()
    buffer.clear()


def _process_one_frame(
    exercise: str,
    img_bgr,
    analyzer_func,
    pose_state: dict,
    record_file: Optional[IO],
    record_buffer: List[dict],
    frame_index: int,
) -> Tuple[dict, Optional[list], Optional[dict], float]:
    """
    CPU-bound: MediaPipe inference + analyzer. Run in executor only.
    Returns (result_dict, landmarks_or_none, record_entry_or_none, processing_time_sec).
    """
    t0 = time.perf_counter()
    landmarks = None
    record_entry = None

    if exercise == "neck_mobility":
        result = analyzer_func(frame_bgr=img_bgr, state=pose_state)
        # neck_mobility runs its own MediaPipe Pose — grab landmarks for overlay
        if pose_state.get("landmarks_33"):
            landmarks = pose_state["landmarks_33"]
    else:
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        mp_results = _pose_model.process(img_rgb)
        if mp_results.pose_landmarks:
            landmarks = [
                {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
                for lm in mp_results.pose_landmarks.landmark
            ]
        result = analyzer_func(landmarks, state=pose_state)

    if record_file and landmarks is not None:
        record_entry = {
            "frame_index": frame_index,
            "timestamp": time.time(),
            "keypoints_2d": landmarks,
            "result": result,
        }
        record_buffer.append(record_entry)
        if len(record_buffer) >= RECORD_BATCH_SIZE:
            _flush_record_buffer_sync(record_buffer, record_file)

    elapsed = time.perf_counter() - t0
    return (result, landmarks, record_entry, elapsed)


# ---------- Analyzer Loader ----------
def get_analyzer(exercise_name: str):
    try:
        module_map = {
            "neck_mobility": "exercises.neck_mobility",
            "leg_raise": "exercises.leg_raise",
            "mini_squat": "exercises.mini_squat",
            "bed_mobility": "exercises.bed_mobility",
            "sit_to_stand": "exercises.sit_to_stand",
            "seated_knee_extension": "exercises.seated_knee_extension",
            "heel_slides": "exercises.heel_slides",
            "marching_in_place": "exercises.marching_in_place",
            "ankle_pumps": "exercises.ankle_pumps",
            "seated_trunk_flexion_extension": "exercises.seated_trunk_flexion_extension",
            "tandem_standing": "exercises.tandem_standing",
            "turn_in_place": "exercises.turn_in_place",
            "shoulder_rolls": "exercises.shoulder_rolls",
            "thoracic_expansion_arm_lift": "exercises.thoracic_expansion_arm_lift",
            "seated_shoulder_flexion": "exercises.seated_shoulder_flexion",
            "seated_elbow_flex_ext": "exercises.seated_elbow_flex_ext",
            "weight_shift": "exercises.weight_shift",
            "diaphragmatic_breathing": "exercises.diaphragmatic_breathing",
            "static_standing": "exercises.static_standing",
            "quadriceps_set": "exercises.quadriceps_set",
            "straight_leg_raise": "exercises.straight_leg_raise",
            "pendulum_exercise": "exercises.pendulum_exercise",
            "standing_hip_abduction": "exercises.standing_hip_abduction",
            "hip_extension": "exercises.hip_extension", 
        }
        module_path = module_map.get(exercise_name, "exercises.base_analyzer")
        module = importlib.import_module(module_path)

        func_name = f"analyze_{exercise_name}"
        if not hasattr(module, func_name):
            if hasattr(module, "analyze_generic"):
                func_name = "analyze_generic"
            else:
                module = importlib.import_module("exercises.base_analyzer")
                func_name = "analyze_generic"
        return getattr(module, func_name)
    except Exception as e:
        print(f"Error loading analyzer for {exercise_name}: {e}")
        import exercises.base_analyzer
        return exercises.base_analyzer.analyze_generic


# ---------- Routes ----------
@app.get("/")
async def root():
    return {"status": "AI Server Running", "endpoints": ["/offer", "/status"]}


@app.get("/status")
async def get_status():
    """Return the latest results and optional pose landmarks for skeleton overlay."""
    async with active_session_lock:
        if active_session is None:
            return JSONResponse({
                "instruction": "No active session",
                "progress": 0,
                "completed": False,
                "reps": 0,
            })
        payload = dict(active_session.latest_results)
        if active_session.latest_landmarks is not None:
            payload["landmarks"] = active_session.latest_landmarks
        return JSONResponse(payload)


@app.post("/offer")
async def offer(request: Request):
    global active_session

    try:
        params = await request.json()
        exercise = params.get("exercise", "neck_mobility")
        is_recording = params.get("is_recording", False)
        print(f"📥 Received offer for: {exercise}")

        if "sdp" not in params or "type" not in params:
            return JSONResponse({"error": "Missing sdp or type"}, status_code=400)

        offer_sdp = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

        async with active_session_lock:
            # ── Force-close any existing session (handles force-kill scenario) ──
            if active_session is not None:
                print("🔁 New offer received — tearing down previous session")
                await active_session.cleanup()
                active_session = None

            # ── Build a fresh PeerConnection and SessionContext ──
            pc = RTCPeerConnection()
            session = SessionContext(pc=pc, exercise=exercise)

            if is_recording:
                os.makedirs("collected_data", exist_ok=True)
                filename = f"collected_data/{exercise}_{int(time.time())}.json"
                session.record_file = open(filename, "w")
                session.record_file.write(
                    '{"metadata": {"exercise": "' + exercise + '"}, "frames": ['
                )

            # ── ICE state logging ──
            @pc.on("iceconnectionstatechange")
            async def on_ice_change():
                print(f"🧊 Server ICE state: {pc.iceConnectionState}")

            # ── Track handler — stores the recv task so it can be cancelled ──
            @pc.on("track")
            def on_track(track):
                if track.kind != "video":
                    return
                print(f"🎥 Video track received: kind={track.kind}")
                session.recv_task = asyncio.create_task(
                    _recv_loop(track, session)
                )

            # ── Connection state — handles graceful close ──
            @pc.on("connectionstatechange")
            async def on_connectionstatechange():
                global active_session
                print(f"🔗 Connection state: {pc.connectionState}")
                if pc.connectionState in ("failed", "closed", "disconnected"):
                    async with active_session_lock:
                        # Only clean up if this PC is still the active one
                        if active_session is not None and active_session.pc is pc:
                            print("❌ Peer disconnected — cleaning up session")
                            await active_session.cleanup()
                            active_session = None


            # ── SDP negotiation (no trickle ICE) ──
            await pc.setRemoteDescription(offer_sdp)
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            # ── Commit the new session ──
            active_session = session

        return JSONResponse({
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type,
        })

    except Exception as e:
        print(f"❌ Error in /offer: {e}")
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


# ---------- Recv + process loop: latest-frame only, no backlog ----------
async def _recv_producer(track, latest_queue: asyncio.Queue, stream_done: asyncio.Event):
    """Drain track into a single-slot queue (always keep only latest frame). Stops on MediaStreamError."""
    try:
        while True:
            frame = await track.recv()
            try:
                latest_queue.put_nowait(frame)
            except asyncio.QueueFull:
                latest_queue.get_nowait()
                latest_queue.put_nowait(frame)
    except MediaStreamError:
        pass
    finally:
        stream_done.set()


async def _recv_loop(track, session: SessionContext):
    """
    Two-part design so pose never lags behind real motion:
    1. Producer: recv() in a loop and put into a size-1 queue (overwrite = drop older frames).
    2. Consumer: take one frame, run MediaPipe + analyzer in executor, update session.
    No unbounded backlog: we only ever process the latest frame. Event loop is never blocked by CPU.
    """
    analyzer_func = get_analyzer(session.exercise)
    print(f"🧠 Analyzer: {analyzer_func.__name__} for exercise: {session.exercise}")

    latest_queue = asyncio.Queue(maxsize=1)
    stream_done = asyncio.Event()
    loop = asyncio.get_event_loop()
    frame_count = 0
    last_log_time = 0.0

    producer = asyncio.create_task(_recv_producer(track, latest_queue, stream_done))

    try:
        while True:
            try:
                frame = await asyncio.wait_for(latest_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                if stream_done.is_set():
                    break
                continue

            frame_count += 1
            t_recv = time.perf_counter()

            img_bgr = frame.to_ndarray(format="bgr24")
            img_bgr = cv2.flip(img_bgr, 1)

            if frame_count == 1:
                os.makedirs("debug_frames", exist_ok=True)
                cv2.imwrite("debug_frames/frame_001.jpg", img_bgr)
                print("💾 Debug frame saved: debug_frames/frame_001.jpg")
            if frame_count <= 3:
                print(
                    f"📷 Frame #{frame_count}: shape={img_bgr.shape} dtype={img_bgr.dtype} "
                    f"min={img_bgr.min()} max={img_bgr.max()}"
                )

            result, landmarks, _, proc_time = await loop.run_in_executor(
                _pose_executor,
                _process_one_frame,
                session.exercise,
                img_bgr,
                analyzer_func,
                session.pose_state,
                session.record_file,
                session.record_buffer,
                frame_count,
            )

            t_done = time.perf_counter()
            total_ms = (t_done - t_recv) * 1000
            proc_ms = proc_time * 1000

            if proc_ms > MAX_PROCESSING_TIME_WARN_MS:
                print(f"⚠️ Backlog risk: frame #{frame_count} processing={proc_ms:.0f}ms (>{MAX_PROCESSING_TIME_WARN_MS}ms)")
            now = time.time()
            if now - last_log_time >= 10.0 and frame_count % 50 == 0:
                print(f"📊 Frame #{frame_count}: processing={proc_ms:.0f}ms total_async={total_ms:.0f}ms")
                last_log_time = now
            if frame_count <= 5 or frame_count % 50 == 0:
                print(f"📊 Result: {result.get('instruction', '?')[:60]}")

            if isinstance(result, dict):
                if "state" in result:
                    session.pose_state = result["state"]
                new_results = {
                    "instruction": result.get("instruction", session.latest_results["instruction"]),
                    "progress": result.get("progress", session.latest_results["progress"]),
                    "completed": result.get("completed", False),
                    "reps": result.get("reps", session.latest_results.get("reps", 0)),
                }
                # Forward any extra exercise-specific keys (e.g. roll_side,
                # current_phase, knee_flexion, torso_rotation, confidence)
                _core_keys = {"instruction", "progress", "completed", "reps", "state"}
                for k, v in result.items():
                    if k not in _core_keys:
                        new_results[k] = v
                session.latest_results = new_results

                session.latest_landmarks = landmarks

    except asyncio.CancelledError:
        print("🛑 recv_loop cancelled (session cleanup)")
    finally:
        producer.cancel()
        try:
            await producer
        except asyncio.CancelledError:
            pass
        print(f"📍 recv_loop exiting after {frame_count} frames")


# ---------- Shutdown Hook ----------
@app.on_event("shutdown")
async def on_shutdown():
    global active_session
    async with active_session_lock:
        if active_session is not None:
            print("🛑 Server shutdown — cleaning up active session")
            await active_session.cleanup()
            active_session = None
