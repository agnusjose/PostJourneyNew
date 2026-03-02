import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const C = {
  primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
  bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C",
  textLight: "#8BA9B8", cardBorder: "#DBE8EE",
};

export default function ExerciseCompleted() {
  const navigation = useNavigation();
  const route = useRoute();

  const exerciseName = route.params?.exerciseName || "Exercise";
  const reps = route.params?.reps ?? "—";
  const targetReps = route.params?.targetReps ?? "—";

  const handleFinish = () => {
    navigation.popToTop();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient
        colors={[C.primary, C.secondary]}
        style={styles.gradientBg}
      >
        <View style={styles.content}>
          {/* Success icon */}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="check-decagram" size={80} color={C.accent} />
          </View>

          <Text style={styles.congratsText}>Congratulations!</Text>
          <Text style={styles.subtitle}>
            You have successfully completed{"\n"}{exerciseName}.
          </Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="counter" size={22} color={C.accent} />
              <Text style={styles.statValue}>{reps}/{targetReps}</Text>
              <Text style={styles.statLabel}>Reps Done</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="check-circle-outline" size={22} color={C.accent} />
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          {/* Finish button */}
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.82}>
            <MaterialCommunityIcons name="home" size={18} color={C.primary} />
            <Text style={styles.finishBtnText}>Finish Exercise</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradientBg: {
    flex: 1, justifyContent: "center",
    paddingTop: Platform.OS === "ios" ? 56 : StatusBar.currentHeight + 16,
  },
  content: {
    alignItems: "center", paddingHorizontal: 28,
  },
  iconCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 28,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.15)",
  },
  congratsText: {
    fontSize: 28, fontWeight: "800", color: "#fff",
    marginBottom: 10, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15, color: "rgba(255,255,255,0.75)",
    textAlign: "center", lineHeight: 22,
    marginBottom: 36, fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row", gap: 14,
    width: "100%", marginBottom: 40,
  },
  statCard: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18, padding: 20, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  statValue: {
    fontSize: 26, fontWeight: "800", color: "#fff",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12, color: "rgba(255,255,255,0.65)",
    fontWeight: "600", marginTop: 4,
  },
  finishBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", width: "100%",
    paddingVertical: 16, borderRadius: 16, gap: 8,
    elevation: 4, shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  finishBtnText: {
    fontSize: 17, fontWeight: "800", color: C.primary, letterSpacing: 0.3,
  },
});