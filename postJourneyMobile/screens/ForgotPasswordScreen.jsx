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

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async () => {
        if (!email) { Alert.alert("Error", "Please enter your email address"); return; }
        setLoading(true);
        try {
            const response = await axios.post("http://172.16.230.150:5000/auth/forgot-password", { email: email.toLowerCase().trim() });
            if (response.data.success) {
                Alert.alert("Success", response.data.message);
                navigation.navigate("ResetPasswordScreen", { email: email.toLowerCase().trim() });
            } else { Alert.alert("Error", response.data.message); }
        } catch (err) {
            console.error("Forgot password error:", err);
            Alert.alert("Error", "Could not connect to server. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <Image source={require("../assets/postjourney_logo.png")} style={styles.logo} resizeMode="contain" />
                <Text style={styles.heroTitle}>Forgot Password</Text>
                <Text style={styles.heroSub}>Reset your PostJourney account</Text>
            </LinearGradient>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={styles.body}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Reset Password</Text>
                        <Text style={styles.cardSub}>Enter your registered email and we'll send you an OTP.</Text>

                        <Text style={styles.label}>Email Address</Text>
                        <TextInput placeholder="Enter your email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={C.textLight} style={styles.input} />

                        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSendOtp} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>SEND OTP</Text>}
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
    cardSub: { fontSize: 14, color: C.textMid, lineHeight: 20, marginBottom: 24 },
    label: { fontSize: 12, fontWeight: "700", color: C.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
    input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textDark, fontWeight: "500", marginBottom: 20 },
    btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
    btnDisabled: { backgroundColor: C.textLight },
    btnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
});
