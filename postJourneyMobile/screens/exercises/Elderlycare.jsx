import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const C = {
  primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
  bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C",
  textLight: "#8BA9B8", cardBorder: "#DBE8EE",
};

const EXERCISES = [
  { label: "Tandem Standing", key: "TANDEM_STANDING", icon: "human", color: "#D97706", bg: "#FEF3C7" },
  { label: "Turn-in-Place", key: "TURN_IN_PLACE", icon: "rotate-3d-variant", color: "#0A5F7A", bg: "#E6F3F7" },
];

export default function ElderlyCareScreen({ navigation }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroCenter}>
          <MaterialCommunityIcons name="walk" size={36} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroTitle}>Elderly Care</Text>
          <Text style={styles.heroSub}>Select a stability exercise to begin</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Available Exercises</Text>
        {EXERCISES.map((ex, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.card}
            onPress={() => navigation.navigate("ExercisesDemo", { exerciseKey: ex.key })}
            activeOpacity={0.82}
          >
            <View style={[styles.iconWrap, { backgroundColor: ex.bg }]}>
              <MaterialCommunityIcons name={ex.icon} size={24} color={ex.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{ex.label}</Text>
              <Text style={styles.cardSub}>Start AI-guided session</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.textLight} />
          </TouchableOpacity>
        ))}

        <View style={styles.tipCard}>
          <LinearGradient colors={["#E6F9F5", "#F0FBF9"]} style={styles.tipGradient}>
            <View style={styles.tipLeft}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={28} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Training Tip</Text>
              <Text style={styles.tipText}>
                Perform these exercises near a sturdy chair or wall for extra support if needed.
              </Text>
            </View>
          </LinearGradient>
        </View>
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
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 8, letterSpacing: -0.3 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 4 },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13, fontWeight: "800", color: C.textLight,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 16,
  },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.cardBorder,
    elevation: 2, shadowColor: "#0D2535",
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  iconWrap: {
    width: 50, height: 50, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.textDark, marginBottom: 2 },
  cardSub: { fontSize: 12, color: C.textMid, fontWeight: "500" },
  tipCard: {
    borderRadius: 18, marginTop: 8, overflow: "hidden",
    borderWidth: 1, borderColor: "#C6EFE6",
  },
  tipGradient: {
    flexDirection: "row", alignItems: "flex-start", padding: 16, gap: 14,
  },
  tipLeft: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "#DCFCE7", justifyContent: "center",
    alignItems: "center", flexShrink: 0,
  },
  tipTitle: {
    fontSize: 14, fontWeight: "800", color: "#065F46",
    marginBottom: 5, letterSpacing: 0.2,
  },
  tipText: { fontSize: 12, color: "#094d38", lineHeight: 18, fontWeight: "500" },
});