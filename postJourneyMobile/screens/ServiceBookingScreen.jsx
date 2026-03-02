import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const C = { primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE" };

const SERVICES = [
  {
    id: "equipment",
    icon: "medical-bag",
    label: "Medical Equipment",
    desc: "Rent medical equipment for your rehabilitation needs.",
    bg: "#E6F3F7",
    color: "#0A5F7A",
    screen: "PatientEquipmentList",
  },
  {
    id: "caregiver",
    icon: "account-heart-outline",
    label: "Caregiver Services",
    desc: "Find professional caregivers for home support and recovery.",
    bg: "#F3EEFF",
    color: "#7C3AED",
    screen: "CaregiverListScreen",
  },
];

export default function ServiceBookingScreen({ navigation }) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("PatientDashboard")} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroCenter}>
          <MaterialCommunityIcons name="hospital-box-outline" size={36} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroTitle}>Service Booking</Text>
          <Text style={styles.heroSub}>Choose a care service to continue</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body}>
        {SERVICES.map(svc => (
          <TouchableOpacity key={svc.id} style={styles.card} onPress={() => navigation.navigate(svc.screen)} activeOpacity={0.85}>
            <View style={[styles.iconWrap, { backgroundColor: svc.bg }]}>
              <MaterialCommunityIcons name={svc.icon} size={36} color={svc.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{svc.label}</Text>
              <Text style={styles.cardDesc}>{svc.desc}</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={22} color={C.textLight} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: { paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12, paddingBottom: 24, paddingHorizontal: 18 },
  backBtn: { marginBottom: 12 },
  heroCenter: { alignItems: "center" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 8, letterSpacing: -0.3 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 4 },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.cardBorder, elevation: 3, shadowColor: "#0D2535", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 16 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: C.textDark, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: C.textMid, lineHeight: 18, fontWeight: "500" },
});
