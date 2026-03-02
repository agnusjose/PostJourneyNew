import React, { useEffect, useRef, useState, useCallback } from "react";
import { POSE_API_BASE_URL } from "../../utils/apiConfig";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCameraPermissions } from "expo-camera";
import { RTCView } from "react-native-webrtc";
import { startWebRTCStream } from "../../utils/webrtcClient";
import * as Speech from "expo-speech";
import { FONTS } from "../../utils/fonts";

// ── Design tokens ──
const COLORS = {
  background: "#000000",
  surface: "rgba(15, 23, 42, 0.88)",
  textPrimary: "#F9FAFB",
  textSecondary: "rgba(249, 250, 251, 0.75)",
  primaryButton: "#2563EB",
  success: "#2E7D32",
  successSoft: "rgba(46, 125, 50, 0.22)",
  progressBg: "#111827",
  // Overlay state colours
  neutral: "#9CA3AF",       // gray
  dorsiflexion: "#3B82F6",  // blue
  plantarflexion: "#22C55E",// green
  error: "#EF4444",         // red
};

// Overlay point radius
const DOT_RADIUS = 8;
const LINE_WIDTH = 3;

// LERP factor for smooth overlay movement (0 = no move, 1 = instant)
const LERP_FACTOR = 0.35;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpPoint(prev, next) {
  if (!prev) return next;
  return {
    x: lerp(prev.x, next.x, LERP_FACTOR),
    y: lerp(prev.y, next.y, LERP_FACTOR),
  };
}

// ── State colour map ──
function getStateColour(state) {
  switch (state) {
    case "DORSIFLEXION":
      return COLORS.dorsiflexion;
    case "PLANTARFLEXION":
      return COLORS.plantarflexion;
    case "NEUTRAL":
    case "WAITING":
      return COLORS.neutral;
    case "COMPLETED":
      return COLORS.success;
    default:
      return COLORS.neutral;
  }
}

// ── Direction arrow ──
function getDirectionArrow(state) {
  if (state === "NEUTRAL" || state === "WAITING") return "↑ Pull toes UP";
  if (state === "DORSIFLEXION") return "↓ Point toes DOWN";
  if (state === "PLANTARFLEXION") return "↔ Return to neutral";
  if (state === "COMPLETED") return "✓ Done";
  return "";
}

// ── Overlay Line Component ──
function OverlayLine({ from, to, color, screenW, screenH }) {
  if (!from || !to) return null;
  const x1 = from.x * screenW;
  const y1 = from.y * screenH;
  const x2 = to.x * screenW;
  const y2 = to.y * screenH;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <View
      style={{
        position: "absolute",
        left: x1,
        top: y1 - LINE_WIDTH / 2,
        width: length,
        height: LINE_WIDTH,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
        transformOrigin: "left center",
        opacity: 0.85,
        borderRadius: LINE_WIDTH / 2,
      }}
    />
  );
}

// ── Overlay Dot Component ──
function OverlayDot({ point, color, label, screenW, screenH }) {
  if (!point) return null;
  const x = point.x * screenW - DOT_RADIUS;
  const y = point.y * screenH - DOT_RADIUS;
  return (
    <View style={{ position: "absolute", left: x, top: y, alignItems: "center" }}>
      <View
        style={{
          width: DOT_RADIUS * 2,
          height: DOT_RADIUS * 2,
          borderRadius: DOT_RADIUS,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: "#FFFFFF",
          opacity: 0.9,
        }}
      />
      {label && (
        <Text
          style={{
            color: "#FFF",
            fontSize: 9,
            fontFamily: FONTS.medium,
            marginTop: 2,
            textShadowColor: "rgba(0,0,0,0.8)",
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

export default function AnklePumpsMonitor() {
  const navigation = useNavigation();
  const { width: screenW, height: screenH } = Dimensions.get("window");

  const [instruction, setInstruction] = useState(
    "Position camera to see your lower legs and feet"
  );
  const [progress, setProgress] = useState(0);
  const [reps, setReps] = useState(0);
  const [ankleAngle, setAnkleAngle] = useState(null);
  const [currentState, setCurrentState] = useState("WAITING");
  const [confidence, setConfidence] = useState(0);
  const [streamReady, setStreamReady] = useState(false);
  const [localStream, setLocalStream] = useState(null);

  // Landmark positions (LERP-smoothed on the frontend too)
  const [overlayPts, setOverlayPts] = useState(null);
  const prevPtsRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();

  // TTS refs
  const lastSpokenRef = useRef("");
  const lastSpeakTimeRef = useRef(0);
  const completedHandledRef = useRef(false);

  const isHighPriority = (text) => {
    const priorities = [
      "pull", "point", "toes", "pump", "complete", "great",
      "dorsi", "plantar", "neutral", "adjust", "rep",
    ];
    const lower = text.toLowerCase();
    return priorities.some((p) => lower.includes(p));
  };

  // ── TTS ──
  useEffect(() => {
    if (!instruction || instruction === lastSpokenRef.current) return;
    const highPriority = isHighPriority(instruction);
    const now = Date.now();
    const elapsed = now - lastSpeakTimeRef.current;
    if (!highPriority && elapsed < 2000) return;

    lastSpokenRef.current = instruction;
    lastSpeakTimeRef.current = now;

    const cleanText = instruction
      .replace(/\(\d+\/\d+\)/g, "")
      .replace(/\d+°/g, "")
      .trim();
    if (cleanText.length > 5) {
      Speech.stop();
      Speech.speak(cleanText, { language: "en-US", rate: 0.95, pitch: 1.0 });
    }
  }, [instruction]);

  useEffect(() => {
    return () => Speech.stop();
  }, []);

  // ── Camera permission ──
  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  // ── WebRTC stream ──
  useEffect(() => {
    if (!permission?.granted) return;
    let stopStream;
    startWebRTCStream(POSE_API_BASE_URL, "ankle_pumps", (s) =>
      setLocalStream(s)
    )
      .then((stopFunc) => {
        stopStream = stopFunc;
        setStreamReady(true);
      })
      .catch((err) => {
        console.error("WebRTC stream failed:", err);
      });
    return () => {
      if (stopStream) stopStream();
      setLocalStream(null);
    };
  }, [permission?.granted]);

  // ── Status polling ──
  useEffect(() => {
    if (!streamReady) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${POSE_API_BASE_URL}/status`);
        const data = await res.json();

        if (data.instruction) setInstruction(data.instruction);
        if (typeof data.progress === "number") setProgress(data.progress);
        if (typeof data.reps === "number") setReps(data.reps);
        if (typeof data.ankle_angle === "number") setAnkleAngle(data.ankle_angle);
        if (data.current_state) setCurrentState(data.current_state);
        if (typeof data.confidence === "number") setConfidence(data.confidence);

        // LERP-smooth landmark overlay points
        if (data.ankle_landmarks) {
          const raw = data.ankle_landmarks;
          const prev = prevPtsRef.current;
          const smoothed = {
            knee: lerpPoint(prev?.knee, raw.knee),
            ankle: lerpPoint(prev?.ankle, raw.ankle),
            heel: lerpPoint(prev?.heel, raw.heel),
            toe: lerpPoint(prev?.toe, raw.toe),
          };
          prevPtsRef.current = smoothed;
          setOverlayPts(smoothed);
        } else {
          // No landmarks — freeze overlay (don't clear)
        }

        if (data.completed && !completedHandledRef.current) {
          completedHandledRef.current = true;
          clearInterval(interval);
          setTimeout(() => {
            navigation.replace("ExerciseCompleted");
          }, 3000);
        }
      } catch {
        // silent by design
      }
    }, 200);
    return () => clearInterval(interval);
  }, [streamReady]);

  const stateColor = getStateColour(currentState);
  const directionLabel = getDirectionArrow(currentState);

  // ── Loading ──
  if (!permission || !permission.granted) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={COLORS.success} />
        <Text style={styles.loadingText}>Waiting for camera permission…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {/* Camera preview */}
      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={StyleSheet.absoluteFillObject}
          objectFit="cover"
          mirror={true}
        />
      )}

      {/* ── Landmark Overlay Layer ── */}
      {overlayPts && confidence > 0.3 && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {/* Lines */}
          <OverlayLine
            from={overlayPts.knee}
            to={overlayPts.ankle}
            color={stateColor}
            screenW={screenW}
            screenH={screenH}
          />
          <OverlayLine
            from={overlayPts.ankle}
            to={overlayPts.toe}
            color={stateColor}
            screenW={screenW}
            screenH={screenH}
          />
          <OverlayLine
            from={overlayPts.ankle}
            to={overlayPts.heel}
            color={stateColor}
            screenW={screenW}
            screenH={screenH}
          />

          {/* Dots */}
          <OverlayDot
            point={overlayPts.knee}
            color={stateColor}
            label="Knee"
            screenW={screenW}
            screenH={screenH}
          />
          <OverlayDot
            point={overlayPts.ankle}
            color={stateColor}
            label="Ankle"
            screenW={screenW}
            screenH={screenH}
          />
          <OverlayDot
            point={overlayPts.heel}
            color={stateColor}
            label="Heel"
            screenW={screenW}
            screenH={screenH}
          />
          <OverlayDot
            point={overlayPts.toe}
            color={stateColor}
            label="Toe"
            screenW={screenW}
            screenH={screenH}
          />
        </View>
      )}

      {/* ── HUD ── */}
      <View style={styles.hudContainer}>
        <View style={styles.feedbackCard}>
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>ANKLE PUMPS AI</Text>
            <View style={[styles.stateBadge, { backgroundColor: stateColor + "33" }]}>
              <Text style={[styles.stateBadgeText, { color: stateColor }]}>
                {currentState}
              </Text>
            </View>
          </View>

          {/* Instruction */}
          <Text style={styles.feedbackText}>{instruction}</Text>

          {/* Direction arrow */}
          {directionLabel ? (
            <Text style={[styles.directionLabel, { color: stateColor }]}>
              {directionLabel}
            </Text>
          ) : null}

          {/* Metrics row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricBadge}>
              <Text style={styles.metricValue}>{reps}/5</Text>
              <Text style={styles.metricLabel}>Reps</Text>
            </View>
            <View style={styles.metricBadge}>
              <Text style={styles.metricValue}>
                {ankleAngle != null ? `${ankleAngle}°` : "—"}
              </Text>
              <Text style={styles.metricLabel}>Angle</Text>
            </View>
            <View style={styles.metricBadge}>
              <Text style={styles.metricValue}>
                {Math.round(confidence * 100)}%
              </Text>
              <Text style={styles.metricLabel}>Conf</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBg}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>
      </View>

      {/* Loading overlay */}
      {!streamReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.success} />
          <Text style={styles.loadingText}>Starting camera stream…</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  hudContainer: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
  },

  feedbackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  title: {
    color: COLORS.primaryButton,
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 1,
  },

  stateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },

  stateBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
  },

  feedbackText: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontFamily: FONTS.medium,
    marginVertical: 8,
    lineHeight: 24,
  },

  directionLabel: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    marginBottom: 8,
    textAlign: "center",
  },

  metricsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 8,
    gap: 12,
  },

  metricBadge: {
    alignItems: "center",
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 70,
  },

  metricValue: {
    color: COLORS.success,
    fontSize: 18,
    fontFamily: FONTS.bold,
  },

  metricLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: FONTS.medium,
    marginTop: 2,
  },

  progressBg: {
    height: 8,
    backgroundColor: COLORS.progressBg,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 4,
  },

  progressFill: {
    height: "100%",
    backgroundColor: COLORS.success,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: COLORS.textPrimary,
    marginTop: 12,
    fontFamily: FONTS.medium,
  },
});
