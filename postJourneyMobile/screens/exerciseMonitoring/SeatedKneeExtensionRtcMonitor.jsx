import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from "react-native";
import { RTCView } from "react-native-webrtc";
import { useNavigation } from "@react-navigation/native";
import { useCameraPermissions } from "expo-camera";
import { startKneeExtensionSession } from "../../utils/kneeWebrtcClient";
import { POSE_API_BASE_URL } from "../../utils/apiConfig";
import PoseSkeletonOverlay from "../../components/PoseSkeletonOverlay";
import { FONTS } from "../../utils/fonts";

const COLORS = {
  primary: "#1E3A5F",
  primaryButton: "#2563EB",
  background: "#000000",
  surface: "rgba(15, 23, 42, 0.9)",
  textPrimary: "#F9FAFB",
  textSecondary: "rgba(249, 250, 251, 0.8)",
  success: "#2E7D32",
  successSoft: "rgba(46, 125, 50, 0.22)",
  progressBg: "#111827",
};

export default function SeatedKneeExtensionRtcMonitor() {
  const navigation = useNavigation();

  const [permission, requestPermission] = useCameraPermissions();
  const [localStream, setLocalStream] = useState(null);
  const [connecting, setConnecting] = useState(true);

  const [kneeAngle, setKneeAngle] = useState(null);
  const [phase, setPhase] = useState("REST");
  const [reps, setReps] = useState(0);
  const [message, setMessage] = useState("Position yourself in front of the camera");
  const [confidence, setConfidence] = useState(null);
  const [landmarks, setLandmarks] = useState(null);

  const stopRef = useRef(null);

  // Request camera permission via expo-camera
  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Start the WebRTC + DataChannel session once permission is granted
  useEffect(() => {
    if (!permission?.granted) return;

    let active = true;

    const run = async () => {
      try {
        const stop = await startKneeExtensionSession(
          (payload) => {
            if (!active) return;
            if (typeof payload.knee_angle === "number") setKneeAngle(Math.round(payload.knee_angle));
            if (payload.state) setPhase(payload.state);
            if (typeof payload.reps === "number") setReps(payload.reps);
            if (payload.message) setMessage(payload.message);
            if (typeof payload.confidence === "number") setConfidence(payload.confidence);

            if (payload.completed) {
              // Optional: backend can send completed flag
              setTimeout(() => {
                if (active) navigation.replace("ExerciseCompleted");
              }, 2500);
            }
          },
          (stream) => {
            if (!active) return;
            setLocalStream(stream);
            setConnecting(false);
          }
        );
        stopRef.current = stop;
      } catch (err) {
        console.error("Knee extension WebRTC failed:", err);
        setConnecting(false);
        setMessage("Unable to start session. Please try again.");
      }
    };

    run();

    return () => {
      active = false;
      if (stopRef.current) {
        stopRef.current().catch(() => { });
        stopRef.current = null;
      }
      setLocalStream(null);
    };
  }, [permission?.granted]);

  // Poll /webrtc_pose/status for landmarks overlay
  useEffect(() => {
    if (connecting) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${POSE_API_BASE_URL}/webrtc_pose/status`);
        const data = await res.json();
        if (Array.isArray(data.landmarks)) setLandmarks(data.landmarks);
      } catch { /* silent */ }
    }, 250);
    return () => clearInterval(interval);
  }, [connecting]);

  if (!permission) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={COLORS.success} />
        <Text style={styles.loadingText}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={COLORS.success} />
        <Text style={styles.loadingText}>Camera access is required for this exercise.</Text>
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
            mirror={false}
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
          <Text style={styles.title}>SEATED KNEE EXTENSION AI</Text>
          <Text style={styles.feedbackText}>{message}</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>PHASE</Text>
              <Text style={styles.metricValue}>{phase}</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>REPS</Text>
              <Text style={styles.metricValue}>{reps}</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>ANGLE</Text>
              <Text style={styles.metricValue}>
                {kneeAngle != null ? `${kneeAngle}°` : "--"}
              </Text>
            </View>
          </View>

          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(Math.max((kneeAngle || 0) / 160, 0), 1) * 100}%` },
              ]}
            />
          </View>

          {confidence != null && (
            <Text style={styles.confidenceText}>
              Confidence {Math.round(confidence * 100)}%
            </Text>
          )}
        </View>
      </View>

      {connecting && (
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

  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },

  metricPill: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
  },

  metricLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    letterSpacing: 0.8,
  },

  metricValue: {
    marginTop: 2,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
  },

  progressBg: {
    marginTop: 12,
    height: 8,
    backgroundColor: COLORS.progressBg,
    borderRadius: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: COLORS.success,
  },

  confidenceText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
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

