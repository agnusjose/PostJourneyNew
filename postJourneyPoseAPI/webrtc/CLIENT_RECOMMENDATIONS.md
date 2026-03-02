# Client recommendations for low-latency pose feedback

Backend is tuned for **real-time pose**: latest-frame processing, no backlog, CPU offload. To minimize perceived lag on the device:

## Camera FPS

- **Current (webrtcClient.js):** `frameRate: 15`
- **Recommendation:** Keep **15** or align with server `TARGET_FPS` (15). Avoid going above 20 on mobile (extra bandwidth and server load with little gain).
- **Do not** lower below 10; instructions will feel sluggish.

## Status polling

- **Current (e.g. SitToStandMonitor):** `setInterval(..., 500)` → poll `/status` every **500 ms**.
- **Recommendation:** Use **200–250 ms** for snappier instruction/rep updates without overloading the server. Example:

```javascript
const interval = setInterval(async () => {
  // ... fetch /status, setInstruction, setProgress, setReps ...
}, 250);
```

- Tradeoff: 500 ms is safer on slow networks; 200–250 ms gives better perceived real-time feedback when the backend is keeping up.

## No signaling changes

- No changes to offer/answer or WebRTC signaling are required. Restart safety and connection handling stay as-is.
