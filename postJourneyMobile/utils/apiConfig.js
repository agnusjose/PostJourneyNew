// ─────────────────────────────────────────────────────────────────────────────
// API Configuration
//
// When testing on a PHYSICAL PHONE, set POSE_API_HOST to your machine's
// local network IP (run `ipconfig` on Windows / `ifconfig` on Mac to find it).
//
// When running in an Android Emulator you can use 10.0.2.2 (maps to host PC).
//
// When running in the Expo web browser you can use 127.0.0.1.
// ─────────────────────────────────────────────────────────────────────────────

export const POSE_API_HOST = "10.63.72.99"; // ← Your PC's local network IP
export const POSE_API_PORT = 8001;
export const POSE_API_BASE_URL = `http://${POSE_API_HOST}:${POSE_API_PORT}`;
