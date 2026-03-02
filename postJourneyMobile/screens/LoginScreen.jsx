import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Image, Alert,
  ScrollView, KeyboardAvoidingView, Platform, StyleSheet,
  ActivityIndicator, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const C = {
  primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9",
  textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE",
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert("Error", "Please enter both email and password."); return; }
    setLoading(true);
    try {
      const response = await axios.post("http://172.16.230.150:5000/login", { email: email.toLowerCase().trim(), password });
      const data = response.data;
      console.log("Full login response:", data);
      if (data.success) {
        const { userType, name, email: userEmail, userId, profileCompleted, verificationStatus } = data;
        login({ userId, name, email: userEmail, userType, serviceType: data.serviceType || "", profileCompleted: profileCompleted || false });
        console.log("✅ User data saved to AuthContext");
        if (userType === "service-provider" || userType === "service provider") {
          if (!profileCompleted) { navigation.navigate("ServiceProviderProfileCompletion", { email: userEmail }); setLoading(false); return; }
          if (verificationStatus !== "approved") { navigation.navigate("ProviderApprovalPending"); setLoading(false); return; }
          if (data.serviceType === "caregiver") { navigation.navigate("CaregiverDashboard", { userId: userId || userEmail, userName: name, userEmail }); }
          else { navigation.navigate("ServiceProviderDashboard", { userId: userId || userEmail, userName: name, userEmail }); }
          setLoading(false); return;
        }
        if (userType === "patient") {
          if (!profileCompleted) {
            Alert.alert("Profile Incomplete", "Please complete your profile first.", [{ text: "Complete Profile", onPress: () => navigation.navigate("PatientProfileCompletion", { email: userEmail }) }]);
            setLoading(false); return;
          }
          navigation.navigate("PatientDashboard", { userId: userId || userEmail, userName: name, userEmail });
        } else if (userType === "doctor") {
          navigation.navigate("DoctorDashboard", { userId: userId || userEmail, userName: name, userEmail });
          setLoading(false); return;
        } else { Alert.alert("Error", "Unknown user type: " + userType); }
      } else { Alert.alert("Login Failed", data.message || "Invalid login"); }
    } catch (err) {
      console.error("Login error details:", { message: err.message, response: err.response?.data, status: err.response?.status });
      Alert.alert("Error", err.response?.data?.message || err.message || "Something went wrong. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <Image source={require("../assets/postjourney_logo.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.heroTitle}>PostJourney</Text>
        <Text style={styles.heroSub}>Your Recovery Partner</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSub}>Welcome back to PostJourney</Text>

            <Text style={styles.label}>Email Address</Text>
            <TextInput placeholder="Enter your email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={C.textLight} style={styles.input} />

            <Text style={styles.label}>Password</Text>
            <TextInput placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={C.textLight} style={styles.input} />

            <TouchableOpacity onPress={() => navigation.navigate("ForgotPasswordScreen")} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>SIGN IN</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("RegisterScreen")} style={styles.linkRow}>
              <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkAccent}>Register</Text></Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("AdminLoginScreen")} style={styles.adminRow}>
              <Text style={styles.adminText}>Admin Login</Text>
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
  logo: { width: 90, height: 90, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 2 },
  body: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.cardBorder, elevation: 4, shadowColor: "#0A5F7A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  cardTitle: { fontSize: 22, fontWeight: "800", color: C.textDark, letterSpacing: -0.3, marginBottom: 4 },
  cardSub: { fontSize: 13, color: C.textLight, fontWeight: "500", marginBottom: 24 },
  label: { fontSize: 12, fontWeight: "700", color: C.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textDark, fontWeight: "500", marginBottom: 16 },
  forgotRow: { alignSelf: "flex-end", marginBottom: 20, marginTop: -8 },
  forgotText: { color: C.secondary, fontSize: 13, fontWeight: "600" },
  btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 20 },
  btnDisabled: { backgroundColor: C.textLight },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
  linkRow: { alignItems: "center", marginBottom: 12 },
  linkText: { fontSize: 14, color: C.textMid, fontWeight: "500" },
  linkAccent: { color: C.primary, fontWeight: "700" },
  adminRow: { alignItems: "center", paddingTop: 4 },
  adminText: { fontSize: 13, color: C.textLight, fontWeight: "600", textDecorationLine: "underline" },
});
