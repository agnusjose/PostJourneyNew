import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, StatusBar, Platform,
} from "react-native";
import { Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { EXERCISES } from "../../data/exercises";

const { width } = Dimensions.get("window");

const C = {
  primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
  bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C",
  textLight: "#8BA9B8", cardBorder: "#DBE8EE",
};

export default function ExerciseDemoScreen({ route, navigation }) {
  const { exerciseKey } = route.params;
  const exercise = EXERCISES[exerciseKey];

  const [videoHeight, setVideoHeight] = useState(250);
  const videoRef = useRef(null);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroCenter}>
          <MaterialCommunityIcons name="play-circle-outline" size={36} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroTitle}>{exercise.title}</Text>
          <Text style={styles.heroSub}>Watch the demonstration carefully</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Video Player */}
        <View style={[styles.videoWrapper, { height: videoHeight }]}>
          <Video
            ref={videoRef}
            source={exercise.video}
            style={styles.video}
            resizeMode="contain"
            shouldPlay
            isLooping
            isMuted={true}
            volume={0}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded) return;
              if (!status.isMuted) {
                videoRef.current?.setIsMutedAsync(true).catch(() => { });
              }
            }}
            onReadyForDisplay={(event) => {
              const { width: vidWidth, height: vidHeight } = event.naturalSize;
              const calculatedHeight = (vidHeight / vidWidth) * (width - 44);
              setVideoHeight(calculatedHeight);
            }}
          />
        </View>

        {/* Instructions */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionHeader}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={20} color={C.primary} />
            <Text style={styles.sectionHeader}>How to perform</Text>
          </View>
          {exercise.instructions.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Start Button */}
        <LinearGradient
          colors={[C.primary, C.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.startBtn}
        >
          <TouchableOpacity
            style={styles.startBtnInner}
            onPress={() =>
              navigation.navigate(exercise.monitorScreen, {
                rules: exercise.rules,
              })
            }
            activeOpacity={0.82}
          >
            <MaterialCommunityIcons name="play" size={20} color="#fff" />
            <Text style={styles.startBtnText}>Start Exercise</Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={14} color={C.textMid} />
          <Text style={styles.backLinkText}>Review Exercise List</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: {
    paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12,
    paddingBottom: 24, paddingHorizontal: 18,
  },
  backBtn: { marginBottom: 12 },
  heroCenter: { alignItems: "center" },
  heroTitle: {
    fontSize: 20, fontWeight: "800", color: "#fff",
    marginTop: 8, letterSpacing: -0.3, textAlign: "center",
  },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 4 },
  body: { padding: 20, paddingBottom: 40 },
  videoWrapper: {
    width: "100%", backgroundColor: "#fff",
    borderRadius: 18, overflow: "hidden", marginBottom: 22,
    borderWidth: 1, borderColor: C.cardBorder,
    elevation: 3, shadowColor: "#0D2535",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10,
  },
  video: { width: "100%", height: "100%" },
  instructionCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: C.cardBorder, marginBottom: 24,
    elevation: 2, shadowColor: "#0D2535",
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  instructionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 16, fontWeight: "800", color: C.textDark, letterSpacing: 0.1,
  },
  stepRow: {
    flexDirection: "row", alignItems: "flex-start", marginBottom: 14,
  },
  stepNumber: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: "#E6F3F7", justifyContent: "center",
    alignItems: "center", marginRight: 12, marginTop: 1,
  },
  stepNumberText: {
    color: C.primary, fontWeight: "800", fontSize: 13,
  },
  stepText: {
    flex: 1, fontSize: 14, color: C.textMid, lineHeight: 21, fontWeight: "500",
  },
  startBtn: {
    borderRadius: 16, overflow: "hidden",
    elevation: 4, shadowColor: C.primary,
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  startBtnInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, gap: 8,
  },
  startBtnText: {
    color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.3,
  },
  backLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 18, gap: 6,
  },
  backLinkText: {
    color: C.textMid, fontSize: 14, fontWeight: "600",
  },
});