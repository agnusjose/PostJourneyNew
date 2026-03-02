import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Platform, StatusBar, KeyboardAvoidingView, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";

const C = { primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE", danger: "#EF4444" };

export default function AdminLoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const BASE_URL = "http://192.168.172.72:5000";

  const handleAdminLogin = async () => {
    console.log("ADMIN LOGIN CLICKED");
    setErrorMessage("");
    if (!email || !password) { setErrorMessage("Email and password are required."); return; }
    try {
      const response = await axios.post(`${BASE_URL}/admin/login`, { secretKey: "POSTJOURNEY2024", email, password });
      console.log("ADMIN LOGIN RESPONSE:", response.data);
      if (!response.data.success) { setErrorMessage(response.data.message || "Invalid credentials"); return; }
      navigation.reset({ index: 0, routes: [{ name: "AdminStackNavigator" }] });
    } catch (err) {
      console.log("ADMIN LOGIN ERROR:", err);
      setErrorMessage("Server error. Unable to connect.");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <Image source={require("../assets/postjourney_logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.heroTitle}>Admin Portal</Text>
        <Text style={styles.heroSub}>PostJourney Management Console</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <View style={styles.adminBadge}>
              <MaterialCommunityIcons name="shield-lock-outline" size={16} color={C.primary} />
              <Text style={styles.adminBadgeText}>Admin Access Only</Text>
            </View>

            <Text style={styles.cardTitle}>Sign In</Text>

            <Text style={styles.label}>Admin Email</Text>
            <TextInput placeholder="Enter admin email" value={email} onChangeText={setEmail} autoCapitalize="none" placeholderTextColor={C.textLight} style={styles.input} />

            <Text style={styles.label}>Admin Password</Text>
            <TextInput placeholder="Enter admin password" value={password} secureTextEntry onChangeText={setPassword} placeholderTextColor={C.textLight} style={styles.input} />

            {errorMessage ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color={C.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.btn} onPress={handleAdminLogin}>
              <Text style={styles.btnText}>ADMIN LOGIN</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
              <Text style={styles.backText}>← Back to User Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: { paddingTop: Platform.OS === "ios" ? 60 : 44, paddingBottom: 36, alignItems: "center" },
  logo: { width: 80, height: 80, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 3 },
  body: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.cardBorder, elevation: 3 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", backgroundColor: "#E6F3F7", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  adminBadgeText: { fontSize: 12, fontWeight: "700", color: C.primary },
  cardTitle: { fontSize: 20, fontWeight: "800", color: C.textDark, marginBottom: 20, textAlign: "center" },
  label: { fontSize: 12, fontWeight: "700", color: C.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textDark, fontWeight: "500", marginBottom: 16 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEE2E2", borderRadius: 10, padding: 10, marginBottom: 14 },
  errorText: { color: C.danger, fontSize: 13, fontWeight: "600", flex: 1 },
  btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 4, marginBottom: 16 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
  backRow: { alignItems: "center" },
  backText: { color: C.secondary, fontSize: 13, fontWeight: "600" },
});
