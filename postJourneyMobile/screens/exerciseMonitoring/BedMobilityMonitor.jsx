import React, { useEffect, useRef, useState } from "react";
import { POSE_API_BASE_URL } from "../../utils/apiConfig";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useCameraPermissions } from "expo-camera";
import { RTCView } from "react-native-webrtc";
import { startWebRTCStream } from "../../utils/webrtcClient";
import * as Speech from "expo-speech";
import { FONTS } from "../../utils/fonts";

// ── Design tokens ──
const COLORS = {
  primary: "#1E3A5F",
  primaryButton: "#2563EB",
  background: "#000000",
  surface: "rgba(15, 23, 42, 0.88)",
  textPrimary: "#F9FAFB",
  textSecondary: "rgba(249, 250, 251, 0.75)",
  accent: "#5B7FA3",
  success: "#2E7D32",
  successSoft: "rgba(46, 125, 50, 0.22)",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.18)",
  progressBg: "#111827",
  stepActive: "#2563EB",
  stepDone: "#2E7D32",
  stepPending: "#374151",
};

// ── State machine phases (must match backend) ──
const PHASES = ["SUPINE", "KNEE_BENT", "ARM_REACH", "CORE_ROTATION", "SIDE_LYING"];
const PHASE_LABELS = {
  SUPINE: "Supine",
  KNEE_BENT: "Knee",
  ARM_REACH: "Arm",
  CORE_ROTATION: "Rotate",
  SIDE_LYING: "Done ✓",
};

export default function BedMobilityMonitor() {
  const navigation = useNavigation();

  const [instruction, setInstruction] = useState(
    "Position the camera at bed height with your full body visible"
  );
  const [progress, setProgress] = useState(0);
  const [rollSide, setRollSide] = useState(null);
  const [currentPhase, setCurrentPhase] = useState("SUPINE");
  const [kneeFlexion, setKneeFlexion] = useState(0);
  const [torsoRotation, setTorsoRotation] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [streamReady, setStreamReady] = useState(false);
  const [localStream, setLocalStream] = useState(null);

  const [permission, requestPermission] = useCameraPermissions();

  // TTS refs
  const lastSpokenRef = useRef("");
  const lastSpeakTimeRef = useRef(0);
  const completedHandledRef = useRef(false);

  const isHighPriority = (text) => {
    const priorities = [
      "roll", "bend", "reach", "engage", "core", "rotate",
      "complete", "excellent", "ready", "well done",
      "start again", "lost", "adjust",
    ];
    const lower = text.toLowerCase();
    return priorities.some((p) => lower.includes(p));
  };

  // ── TTS effect ──
  useEffect(() => {
    if (!instruction || instruction === lastSpokenRef.current) return;

    const highPriority = isHighPriority(instruction);
    const now = Date.now();
    const elapsed = now - lastSpeakTimeRef.current;

    if (!highPriority && elapsed < 2000) return;

    lastSpokenRef.current = instruction;
    lastSpeakTimeRef.current = now;

    const cleanText = instruction
      .replace(/\(\d+s\)/g, "")
      .replace(/\d+%/g, "")
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

    startWebRTCStream(POSE_API_BASE_URL, "bed_mobility", (s) =>
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
        if (data.roll_side) setRollSide(data.roll_side);
        if (data.current_phase) setCurrentPhase(data.current_phase);
        if (typeof data.knee_flexion === "number") setKneeFlexion(data.knee_flexion);
        if (typeof data.torso_rotation === "number") setTorsoRotation(data.torso_rotation);
        if (typeof data.confidence === "number") setConfidence(data.confidence);

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
    }, 250);

    return () => clearInterval(interval);
  }, [streamReady]);

  // ── Phase step index ──
  const currentPhaseIdx = PHASES.indexOf(currentPhase);

  // ── Loading: permission ──
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

      {/* HUD */}
      <View style={styles.hudContainer}>
        <View style={styles.feedbackCard}>
          {/* Title row with roll direction */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>BED MOBILITY — ROLLING AI</Text>
            {rollSide && (
              <View style={styles.rollBadge}>
                <Text style={styles.rollBadgeText}>
                  {rollSide === "RIGHT" ? "→ RIGHT" : "← LEFT"}
                </Text>
              </View>
            )}
          </View>

          {/* Instruction */}
          <Text style={styles.feedbackText}>{instruction}</Text>

          {/* Step indicator */}
          <View style={styles.stepsRow}>
            {PHASES.map((phase, idx) => {
              let dotColor = COLORS.stepPending;
              let labelColor = COLORS.textSecondary;
              if (idx < currentPhaseIdx) {
                dotColor = COLORS.stepDone;
                labelColor = COLORS.stepDone;
              } else if (idx === currentPhaseIdx) {
                dotColor = COLORS.stepActive;
                labelColor = COLORS.stepActive;
              }
              return (
                <View key={phase} style={styles.stepItem}>
                  <View style={[styles.stepDot, { backgroundColor: dotColor }]} />
                  <Text style={[styles.stepLabel, { color: labelColor }]}>
                    {PHASE_LABELS[phase]}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Metrics row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricBadge}>
              <Text style={styles.metricValue}>{kneeFlexion}°</Text>
              <Text style={styles.metricLabel}>Knee</Text>
            </View>
            <View style={styles.metricBadge}>
              <Text style={styles.metricValue}>{torsoRotation}°</Text>
              <Text style={styles.metricLabel}>Torso</Text>
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

  rollBadge: {
    backgroundColor: COLORS.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },

  rollBadgeText: {
    color: COLORS.warning,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },

  feedbackText: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontFamily: FONTS.medium,
    marginVertical: 10,
    lineHeight: 24,
  },

  // ── Steps ──
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },

  stepItem: {
    alignItems: "center",
    flex: 1,
  },

  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },

  stepLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
  },

  // ── Metrics ──
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

  // ── Progress ──
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

  // ── Loading ──
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
