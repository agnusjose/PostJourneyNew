import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";

const C = {
  primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9",
  textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE",
  success: "#10B981",
};

export default function OtpVerifyScreen({ route, navigation }) {
  const { email, userType } = route.params;
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [timer, setTimer] = useState(40);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const BASE_URL = "http://172.16.230.150:5000";

  useEffect(() => {
    console.log("OTP Screen loaded with params:", { email, userType });
    setDebugInfo(`Email: ${email}, UserType: ${userType}`);
    if (timer === 0) { setCanResend(true); return; }
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerifyOtp = async () => {
    console.log("Verify OTP clicked:", { email, otp, userType });
    if (!otp) { Alert.alert("Error", "Please enter OTP"); return; }
    if (otp.length !== 6) { Alert.alert("Error", "OTP must be 6 digits"); return; }
    setLoading(true); setErrorMessage("");
    try {
      const response = await axios.post(`${BASE_URL}/verify-otp`, { email, otp });
      console.log("Server response:", response.data);
      if (!response.data.success) { Alert.alert("Verification Failed", response.data.message || "Invalid OTP"); setErrorMessage(response.data.message || "Invalid OTP"); setLoading(false); return; }
      setTimeout(() => {
        if (userType === "patient") navigation.replace("PatientProfileCompletion", { email });
        else if (userType === "service provider" || userType === "service-provider") navigation.replace("ServiceProviderProfileCompletion", { email });
        else navigation.replace("LoginScreen");
      }, 100);
    } catch (err) {
      console.error("OTP Verification Error:", err);
      setDebugInfo(`Error: ${err.message}`);
      if (err.response) { Alert.alert("Server Error", err.response.data?.message || "Server error occurred"); setErrorMessage(err.response.data?.message || "Server error"); }
      else if (err.request) { Alert.alert("Network Error", "Unable to connect to server."); setErrorMessage("Network error."); }
      else { Alert.alert("Error", "Something went wrong."); setErrorMessage("Something went wrong"); }
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/resend-otp`, { email });
      if (!response.data.success) { Alert.alert("Error", response.data.message || "Failed to resend OTP"); return; }
      setTimer(40); setCanResend(false);
      Alert.alert("Success", "New OTP sent to your email"); setErrorMessage("");
    } catch (err) { Alert.alert("Error", "Unable to resend OTP"); }
  };

  const testNavigation = () => {
    if (userType === "patient") navigation.replace("PatientProfileCompletion", { email });
    else navigation.replace("ServiceProviderProfileCompletion", { email });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <View style={styles.otpIconWrap}>
          <MaterialCommunityIcons name="shield-check-outline" size={40} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Verify Your Email</Text>
        <Text style={styles.heroSub}>OTP sent to {email}</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {userType === "patient" ? "🧑‍⚕️ Patient" : "🏥 Service Provider"}
              </Text>
            </View>

            <Text style={styles.label}>6-Digit OTP</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="• • • • • •"
              keyboardType="numeric"
              maxLength={6}
              value={otp}
              onChangeText={(text) => { setOtp(text.replace(/[^0-9]/g, "")); setErrorMessage(""); }}
              editable={!loading}
              placeholderTextColor={C.textLight}
            />

            {errorMessage ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>VERIFY OTP</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendRow} onPress={handleResendOtp} disabled={!canResend || loading}>
              <MaterialCommunityIcons name="email-sync-outline" size={16} color={canResend ? C.secondary : C.textLight} />
              <Text style={[styles.resendText, !canResend && styles.resendDisabled]}>
                {canResend ? "Resend OTP" : `Resend OTP in ${timer}s`}
              </Text>
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
  otpIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "500", marginTop: 4 },
  body: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.cardBorder, elevation: 3 },
  typeBadge: { alignSelf: "center", backgroundColor: "#E6F3F7", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginBottom: 24 },
  typeBadgeText: { fontSize: 14, fontWeight: "700", color: C.primary },
  label: { fontSize: 12, fontWeight: "700", color: C.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  otpInput: { backgroundColor: C.bg, borderWidth: 2, borderColor: C.cardBorder, borderRadius: 14, paddingVertical: 16, fontSize: 22, color: C.textDark, fontWeight: "800", textAlign: "center", letterSpacing: 10, marginBottom: 16 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEE2E2", borderRadius: 10, padding: 10, marginBottom: 14 },
  errorText: { color: "#EF4444", fontSize: 13, fontWeight: "600", flex: 1 },
  btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 20 },
  btnDisabled: { backgroundColor: C.textLight },
  btnText: { color: "white", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
  resendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  resendText: { color: C.secondary, fontWeight: "700", fontSize: 14 },
  resendDisabled: { color: C.textLight },
});
