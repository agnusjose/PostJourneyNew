import React, { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, Image, Alert,
    ScrollView, KeyboardAvoidingView, Platform, StyleSheet,
    ActivityIndicator, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9",
    textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE",
};

export default function ResetPasswordScreen({ route, navigation }) {
    const { email } = route.params;
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!otp || !newPassword || !confirmPassword) { Alert.alert("Error", "Please fill in all fields"); return; }
        if (newPassword !== confirmPassword) { Alert.alert("Error", "Passwords do not match"); return; }
        if (newPassword.length < 8) { Alert.alert("Error", "Password must be at least 8 characters"); return; }
        setLoading(true);
        try {
            const response = await axios.post("http://192.168.172.72:5000/auth/reset-password", { email, otp, newPassword });
            if (response.data.success) {
                Alert.alert("Success", "Password reset successfully. Please login with your new password.");
                navigation.navigate("LoginScreen");
            } else { Alert.alert("Error", response.data.message); }
        } catch (err) {
            console.error("Reset password error:", err);
            Alert.alert("Error", "Could not connect to server. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <Image source={require("../assets/postjourney_logo.png")} style={styles.logo} resizeMode="contain" />
                <Text style={styles.heroTitle}>Reset Password</Text>
                <Text style={styles.heroSub}>Create a new secure password</Text>
            </LinearGradient>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={styles.body}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>New Password</Text>
                        <Text style={styles.cardSub}>Enter the OTP sent to {email} and your new password.</Text>

                        <Text style={styles.label}>6-Digit OTP</Text>
                        <TextInput placeholder="Enter OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholderTextColor={C.textLight} style={[styles.input, { letterSpacing: 6, textAlign: "center" }]} />

                        <Text style={styles.label}>New Password</Text>
                        <TextInput placeholder="Min 8 characters" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholderTextColor={C.textLight} style={styles.input} />

                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput placeholder="Re-enter new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor={C.textLight} style={styles.input} />

                        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleResetPassword} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>RESET PASSWORD</Text>}
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
    heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
    heroSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 2 },
    body: { padding: 20, paddingBottom: 40 },
    backRow: { marginBottom: 12 },
    backText: { color: C.secondary, fontSize: 15, fontWeight: "700" },
    card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.cardBorder, elevation: 3 },
    cardTitle: { fontSize: 20, fontWeight: "800", color: C.textDark, marginBottom: 6 },
    cardSub: { fontSize: 13, color: C.textMid, lineHeight: 20, marginBottom: 24 },
    label: { fontSize: 12, fontWeight: "700", color: C.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
    input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textDark, fontWeight: "500", marginBottom: 16 },
    btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 },
    btnDisabled: { backgroundColor: C.textLight },
    btnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
});
