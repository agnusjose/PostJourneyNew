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
  background: "#000000",
  surface: "rgba(15, 23, 42, 0.88)",
  textPrimary: "#F9FAFB",
  textSecondary: "rgba(249, 250, 251, 0.75)",
  accent: "#E11D48",
  success: "#2E7D32",
  successSoft: "rgba(46, 125, 50, 0.22)",
  progressBg: "#111827",
};

export default function StandingHipAbductionMonitor() {
  const navigation = useNavigation();

  const [instruction, setInstruction] = useState(
    "Position yourself in front of the camera"
  );
  const [progress, setProgress] = useState(0);
  const [reps, setReps] = useState(0);
  const TARGET_REPS = 12;
  const [streamReady, setStreamReady] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [landmarks, setLandmarks] = useState(null);

  const [permission, requestPermission] = useCameraPermissions();

  const lastSpokenRef = useRef("");
  const lastSpeakTimeRef = useRef(0);
  const completedHandledRef = useRef(false);

  useEffect(() => {
    if (!instruction) return;
    if (instruction === lastSpokenRef.current) return;

    const now = Date.now();
    if (now - lastSpeakTimeRef.current < 1500) return;

    lastSpokenRef.current = instruction;
    lastSpeakTimeRef.current = now;
    Speech.stop();
    Speech.speak(instruction, { language: "en-US", rate: 0.85, pitch: 1.0 });
  }, [instruction]);

  useEffect(() => { return () => Speech.stop(); }, []);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  useEffect(() => {
    if (!permission?.granted) return;
    let stopStream;
    startWebRTCStream(POSE_API_BASE_URL, "standing_hip_abduction", (s) => setLocalStream(s))
      .then((stopFunc) => { stopStream = stopFunc; setStreamReady(true); })
      .catch((err) => console.error("WebRTC stream failed:", err));
    return () => { if (stopStream) stopStream(); setLocalStream(null); };
  }, [permission?.granted]);

  useEffect(() => {
    if (!streamReady) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${POSE_API_BASE_URL}/status`);
        const data = await res.json();
        if (data.instruction) setInstruction(data.instruction);
        if (typeof data.progress === "number") setProgress(data.progress);
        if (typeof data.reps === "number") setReps(data.reps);
        if (Array.isArray(data.landmarks)) setLandmarks(data.landmarks);
        if (data.completed && !completedHandledRef.current) {
          completedHandledRef.current = true;
          clearInterval(interval);
          setTimeout(() => navigation.replace("ExerciseCompleted", {
            exerciseName: "Standing Hip Abduction",
            reps: data.reps || reps,
            targetReps: TARGET_REPS,
            returnScreen: "PatientDashboard",
          }), 3000);
        }
      } catch { }
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
          <RTCView streamURL={localStream.toURL()} style={StyleSheet.absoluteFillObject} objectFit="cover" mirror={true} />
          <PoseSkeletonOverlay landmarks={landmarks} mirrored={false} style={StyleSheet.absoluteFillObject} />
        </>
      )}
      <View style={styles.hudContainer}>
        <View style={styles.feedbackCard}>
          <Text style={styles.title}>HIP ABDUCTION AI</Text>
          <Text style={styles.feedbackText}>{instruction}</Text>
          <View style={styles.repRow}>
            <View style={styles.repBadge}>
              <Text style={styles.repCount}>{reps}</Text>
              <Text style={styles.repLabel}>/{TARGET_REPS} REPS</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
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
  hudContainer: { position: "absolute", top: 40, left: 20, right: 20 },
  feedbackCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20 },
  title: { color: COLORS.accent, fontFamily: FONTS.bold, marginBottom: 8, fontSize: 13, letterSpacing: 1 },
  repRow: { flexDirection: "row", justifyContent: "center", marginVertical: 8 },
  repBadge: { flexDirection: "row", alignItems: "baseline", backgroundColor: COLORS.successSoft, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  repCount: { color: COLORS.success, fontSize: 28, fontFamily: FONTS.bold },
  repLabel: { color: COLORS.textSecondary, fontSize: 14, fontFamily: FONTS.medium, marginLeft: 4 },
  feedbackText: { color: COLORS.textPrimary, fontSize: 18, fontFamily: FONTS.medium, marginVertical: 12 },
  progressBg: { height: 8, backgroundColor: COLORS.progressBg, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: COLORS.success },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  loadingText: { color: COLORS.textPrimary, marginTop: 12, fontFamily: FONTS.medium },
});