import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9",
    textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE",
};

export default function GooglePasswordScreen({ route, navigation }) {
    const { googleUser } = route.params;

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [userType, setUserType] = useState("patient");
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        // Validation
        if (!password || !confirmPassword) {
            Alert.alert("Error", "Please enter and confirm your password");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            // Register using the normal registration endpoint
            const response = await axios.post("http://192.168.172.72:5000/register", {
                name: googleUser.name,
                email: googleUser.email,
                password: password,
                userType: userType,
                googleId: googleUser.googleId, // Save Google ID for future Google logins
                picture: googleUser.picture,
            });

            if (response.data.success) {
                Alert.alert("Success", response.data.message);
                // Navigate to OTP verification
                navigation.replace("OtpVerifyScreen", {
                    email: googleUser.email,
                    userType: userType,
                });
            } else {
                Alert.alert("Error", response.data.message);
            }
        } catch (err) {
            console.error("Registration error:", err);
            Alert.alert("Error", err.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />

            {/* Hero Section */}
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <Image
                    source={require("../assets/postjourney_logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.heroTitle}>Complete Profile</Text>
                <Text style={styles.heroSub}>Set your account details</Text>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.body}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Finish Registration</Text>

                        {/* Google User Info Card */}
                        <View style={styles.userInfoBox}>
                            {googleUser.picture ? (
                                <Image
                                    source={{ uri: googleUser.picture }}
                                    style={styles.profilePic}
                                />
                            ) : (
                                <View style={styles.profilePicPlaceholder}>
                                    <Text style={styles.profilePicText}>
                                        {googleUser.name?.charAt(0)?.toUpperCase() || "U"}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.userDetails}>
                                <Text style={styles.userName}>{googleUser.name}</Text>
                                <Text style={styles.userEmail}>{googleUser.email}</Text>
                            </View>
                        </View>

                        <Text style={styles.label}>Create Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Min 6 characters"
                            placeholderTextColor={C.textLight}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm password"
                            placeholderTextColor={C.textLight}
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />

                        <Text style={styles.label}>I am a:</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={userType}
                                onValueChange={(itemValue) => setUserType(itemValue)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Patient" value="patient" />
                                <Picker.Item label="Service Provider" value="service-provider" />
                            </Picker>
                        </View>

                        {/* Register Button */}
                        <TouchableOpacity
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.btnText}>REGISTER</Text>
                            )}
                        </TouchableOpacity>

                        {/* Back to Register */}
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backLink}
                        >
                            <Text style={styles.backText}>← Back to Register</Text>
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
    heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
    heroSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 2 },
    body: { padding: 20, paddingBottom: 40 },
    card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.cardBorder, elevation: 4, shadowColor: "#0A5F7A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    cardTitle: { fontSize: 20, fontWeight: "800", color: C.textDark, letterSpacing: -0.3, marginBottom: 16, textAlign: "center" },
    userInfoBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: C.bg,
        borderRadius: 16,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: C.cardBorder,
    },
    profilePic: { width: 50, height: 50, borderRadius: 25 },
    profilePicPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.secondary, justifyContent: "center", alignItems: "center" },
    profilePicText: { color: "white", fontSize: 24, fontWeight: "bold" },
    userDetails: { marginLeft: 15, flex: 1 },
    userName: { fontSize: 16, fontWeight: "bold", color: C.textDark },
    userEmail: { fontSize: 14, color: C.textMid },
    label: { fontSize: 12, fontWeight: "700", color: C.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
    input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textDark, fontWeight: "500", marginBottom: 16 },
    pickerWrapper: { width: "100%", backgroundColor: C.bg, borderRadius: 12, marginBottom: 20, overflow: "hidden", borderWidth: 1, borderColor: C.cardBorder },
    picker: { height: 50, color: C.textDark },
    btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 10, elevation: 3 },
    btnDisabled: { backgroundColor: C.textLight },
    btnText: { color: "white", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
    backLink: { marginTop: 20, alignItems: "center" },
    backText: { color: C.secondary, fontSize: 14, fontWeight: "600" },
});