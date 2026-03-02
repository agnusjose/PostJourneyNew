import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const C = { primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE", warning: "#F59E0B" };

export default function ProviderApprovalPending({ navigation }) {
    const { logout } = useAuth();
    const handleLogout = async () => { if (logout) await logout(); navigation.replace("LoginScreen"); };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="clock-check-outline" size={44} color={C.warning} />
                </View>
                <Text style={styles.heroTitle}>Under Review</Text>
                <Text style={styles.heroSub}>Your profile has been submitted</Text>
            </LinearGradient>

            <View style={styles.body}>
                <View style={styles.card}>
                    <Text style={styles.description}>
                        Your profile has been submitted for admin verification. This usually takes 24–48 hours.
                    </Text>

                    <View style={styles.infoBox}>
                        <MaterialCommunityIcons name="information-outline" size={20} color={C.secondary} />
                        <Text style={styles.infoText}>You will be able to access your dashboard once an admin approves your profile.</Text>
                    </View>

                    {/* Progress Steps */}
                    {[
                        { label: "Registration", done: true },
                        { label: "Profile Submitted", done: true },
                        { label: "Admin Review", active: true },
                        { label: "Access Dashboard", pending: true },
                    ].map((step, i, arr) => (
                        <View key={i}>
                            <View style={styles.step}>
                                <View style={[styles.stepDot, step.done && styles.stepDone, step.active && styles.stepActive]} />
                                <Text style={[styles.stepText, step.done && styles.stepTextDone, step.active && styles.stepTextActive]}>
                                    {step.label}
                                </Text>
                                {step.done && <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />}
                                {step.active && <MaterialCommunityIcons name="clock-outline" size={18} color={C.warning} />}
                            </View>
                            {i < arr.length - 1 && <View style={styles.stepLine} />}
                        </View>
                    ))}

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={18} color="#fff" />
                        <Text style={styles.logoutText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    hero: { paddingTop: Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 24) + 16, paddingBottom: 32, alignItems: "center" },
    iconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)" },
    heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
    heroSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 4 },
    body: { flex: 1, padding: 20 },
    card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.cardBorder, elevation: 3 },
    description: { fontSize: 14, color: C.textMid, textAlign: "center", lineHeight: 22, marginBottom: 16 },
    infoBox: { flexDirection: "row", backgroundColor: "#E6F3F7", borderRadius: 12, padding: 14, marginBottom: 24, alignItems: "flex-start", gap: 10 },
    infoText: { fontSize: 13, color: C.secondary, flex: 1, lineHeight: 18, fontWeight: "500" },
    step: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
    stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#e2e8f0", marginRight: 14 },
    stepDone: { backgroundColor: "#10b981" },
    stepActive: { backgroundColor: C.warning },
    stepText: { flex: 1, fontSize: 14, color: C.textLight, fontWeight: "500" },
    stepTextDone: { color: "#10b981", fontWeight: "600" },
    stepTextActive: { color: C.warning, fontWeight: "700" },
    stepLine: { width: 2, height: 14, backgroundColor: "#E2E8F0", marginLeft: 5 },
    logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, marginTop: 24 },
    logoutText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
