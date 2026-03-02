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
import PoseSkeletonOverlay from "../../components/PoseSkeletonOverlay";
import { FONTS } from "../../utils/fonts";

const COLORS = {
  primary: "#1E3A5F",
  primaryButton: "#2563EB",
  background: "#000000",
  surface: "rgba(15, 23, 42, 0.88)",
  textPrimary: "#F9FAFB",
  textSecondary: "rgba(249, 250, 251, 0.75)",
  success: "#2E7D32",
  successSoft: "rgba(46, 125, 50, 0.22)",
  progressBg: "#111827",
};

const TARGET_REPS = 5;

export default function TurnInPlaceMonitor() {
  const navigation = useNavigation();

  const [instruction, setInstruction] = useState(
    "Position yourself in front of the camera"
  );
  const [progress, setProgress] = useState(0);
  const [reps, setReps] = useState(0);
  const [turnAngle, setTurnAngle] = useState(0);
  const [pauseTime, setPauseTime] = useState(0);
  const [direction, setDirection] = useState("RIGHT");
  const [streamReady, setStreamReady] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [landmarks, setLandmarks] = useState(null);

  const [permission, requestPermission] = useCameraPermissions();
  const lastSpokenRef = useRef("");
  const lastSpeakTimeRef = useRef(0);
  const completedHandledRef = useRef(false);

  const isHighPriority = (text) => {
    const p = [
      "turn", "hold", "switch", "complete", "great",
      "good", "ready", "stand", "slow",
    ];
    return p.some((k) => text.toLowerCase().includes(k));
  };

  // ── TTS ──
  useEffect(() => {
    if (!instruction || instruction === lastSpokenRef.current) return;
    const hp = isHighPriority(instruction);
    const now = Date.now();
    const elapsed = now - lastSpeakTimeRef.current;
    if (!hp && elapsed < 2000) return;

    lastSpokenRef.current = instruction;
    lastSpeakTimeRef.current = now;

    const clean = instruction.replace(/\d+s$/g, "").trim();
    if (clean.length > 3) {
      Speech.stop();
      Speech.speak(clean, { language: "en-US", rate: 0.95, pitch: 1.0 });
    }
  }, [instruction]);

  useEffect(() => {
    return () => Speech.stop();
  }, []);

  // ── Camera ──
  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
  }, [permission]);

  // ── WebRTC ──
  useEffect(() => {
    if (!permission?.granted) return;
    let stopStream;
    startWebRTCStream(POSE_API_BASE_URL, "turn_in_place", (s) =>
      setLocalStream(s)
    )
      .then((f) => {
        stopStream = f;
        setStreamReady(true);
      })
      .catch((e) => console.error("WebRTC stream failed:", e));

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
        if (typeof data.turn_angle === "number") setTurnAngle(data.turn_angle);
        if (typeof data.pause_time === "number") setPauseTime(data.pause_time);
        if (data.direction) setDirection(data.direction);
        if (Array.isArray(data.landmarks)) setLandmarks(data.landmarks);

        if (data.completed && !completedHandledRef.current) {
          completedHandledRef.current = true;
          clearInterval(interval);
          setTimeout(() => navigation.replace("ExerciseCompleted"), 3000);
        }
      } catch {
        /* silent */
      }
    }, 250);
    return () => clearInterval(interval);
  }, [streamReady]);

  if (!permission || !permission.granted) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={COLORS.success} />
        <Text style={styles.loadingText}>Waiting for camera permission...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      {localStream && (
        <>
          <RTCView
            streamURL={localStream.toURL()}
            style={StyleSheet.absoluteFillObject}
            objectFit="cover"
            mirror={true}
          />
          <PoseSkeletonOverlay
            landmarks={landmarks}
            mirrored={false}
            style={StyleSheet.absoluteFillObject}
          />
        </>
      )}

      <View style={styles.hudContainer}>
        <View style={styles.feedbackCard}>
          <Text style={styles.title}>TURN IN PLACE AI</Text>
          <Text style={styles.feedbackText}>{instruction}</Text>

          <View style={styles.repRow}>
            <View style={styles.repBadge}>
              <Text style={styles.repCount}>{reps}</Text>
              <Text style={styles.repLabel}>/{TARGET_REPS} REPS</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>
      </View>

      {!streamReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.success} />
          <Text style={styles.loadingText}>Starting camera stream...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  hudContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
  },

  feedbackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
  },

  title: {
    color: COLORS.primaryButton,
    fontFamily: FONTS.bold,
    marginBottom: 8,
    fontSize: 13,
    letterSpacing: 1,
  },

  feedbackText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: FONTS.medium,
    marginVertical: 12,
  },

  repRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 8,
  },

  repBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },

  repCount: {
    color: COLORS.success,
    fontSize: 28,
    fontFamily: FONTS.bold,
  },

  repLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.medium,
    marginLeft: 4,
  },

  progressBg: {
    height: 8,
    backgroundColor: COLORS.progressBg,
    borderRadius: 4,
    overflow: "hidden",
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
