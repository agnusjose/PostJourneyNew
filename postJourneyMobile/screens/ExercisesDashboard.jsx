import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const C = { primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6", bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE" };

const EXERCISES = [
  { label: "Cardiac Rehabilitation", value: "cardiac-rehabilitation", icon: "heart-pulse", color: "#EF4444", bg: "#FEE2E2" },
  { label: "Stroke Rehabilitation", value: "stroke-rehabilitation", icon: "brain", color: "#8B5CF6", bg: "#EDE9FE" },
  { label: "Post-Surgical Rehab", value: "post-surgical-rehabilitation", icon: "bandage", color: "#F59E0B", bg: "#FEF3C7" },
  { label: "ICU / General Deconditioning", value: "icu-general-deconditioning", icon: "hospital-building", color: "#0A5F7A", bg: "#E6F3F7" },
  { label: "Pulmonary Rehabilitation", value: "pulmonary-rehabilitation", icon: "lungs", color: "#1D8FAB", bg: "#E0F2F7" },
  { label: "Orthopedic Rehabilitation", value: "orthopedic-rehabilitation", icon: "bone", color: "#059669", bg: "#D1FAE5" },
  { label: "Elderly Care", value: "elderly-care", icon: "walk", color: "#D97706", bg: "#FEF3C7" },
  { label: "Common Exercises", value: "common-exercises", icon: "dumbbell", color: "#2EC4B6", bg: "#E6FAF8" },
];

const ROUTE_MAP = {
  "cardiac-rehabilitation": "CardiacRehab",
  "stroke-rehabilitation": "StrokeRehab",
  "post-surgical-rehabilitation": "Post_SurgicalRehab",
  "icu-general-deconditioning": "Icu_General",
  "pulmonary-rehabilitation": "PulmonaryRehab",
  "orthopedic-rehabilitation": "Orthopedic",
  "elderly-care": "ElderlyCare",
  "common-exercises": "CommonExercises",
};

export default function ExercisesDashboard({ navigation }) {
  const handleNavigation = (value) => {
    if (ROUTE_MAP[value]) navigation.navigate(ROUTE_MAP[value]);
    else alert("This clinical module is currently being finalized.");
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <View style={styles.heroInner}>
          <MaterialCommunityIcons name="run-fast" size={36} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroTitle}>Exercise Monitoring</Text>
          <Text style={styles.heroSub}>AI-powered rehabilitation programs</Text>
        </View>
      </LinearGradient>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Rehabilitation Programs</Text>
          {EXERCISES.map((ex, idx) => (
            <TouchableOpacity key={idx} style={styles.card} onPress={() => handleNavigation(ex.value)} activeOpacity={0.82}>
              <View style={[styles.iconWrap, { backgroundColor: ex.bg }]}>
                <MaterialCommunityIcons name={ex.icon} size={24} color={ex.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{ex.label}</Text>
                <Text style={styles.cardSub}>View therapeutic protocols</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={20} color={C.textLight} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: { paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12, paddingBottom: 28, alignItems: "center" },
  heroInner: { alignItems: "center" },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 10, letterSpacing: -0.3 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 4 },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: C.textLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.cardBorder, elevation: 2, shadowColor: "#0D2535", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8 },
  iconWrap: { width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 14 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.textDark, marginBottom: 2 },
  cardSub: { fontSize: 12, color: C.textMid, fontWeight: "500" },
});
