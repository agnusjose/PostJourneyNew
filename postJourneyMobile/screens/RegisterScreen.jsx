import React, { useState, useCallback } from "react";
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
  Modal,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useOAuth, useAuth as useClerkAuth, useUser } from "@clerk/clerk-expo";
import { useAuth } from "../context/AuthContext";

// Warm up browser for OAuth
WebBrowser.maybeCompleteAuthSession();

const C = {
  primary: "#0A5F7A",
  secondary: "#1D8FAB",
  bg: "#F0F6F9",
  textDark: "#0D2535",
  textMid: "#4A6B7C",
  textLight: "#8BA9B8",
  cardBorder: "#DBE8EE",
};

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("patient");
  const [loading, setLoading] = useState(false);

  // Google Auth states
  const [googleUser, setGoogleUser] = useState(null);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState("patient");

  const { login } = useAuth();

  // Clerk OAuth and session
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { signOut, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();

  // Handle Google Sign-In with Clerk
  const handleGoogleSignIn = useCallback(async () => {
    try {
      setLoading(true);

      // Sign out first if already signed in (to allow choosing different account)
      if (isSignedIn) {
        await signOut();
      }

      const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/oauth-callback"),
      });

      console.log("OAuth result:", { createdSessionId, signIn, signUp });

      if (createdSessionId) {
        // Set the active session
        if (setActive) {
          await setActive({ session: createdSessionId });
        }

        // Try multiple ways to get user email
        let userEmail = null;
        let userName = null;
        let googleId = null;
        let picture = null;

        // Method 1: From signUp object
        if (signUp?.emailAddress) {
          userEmail = signUp.emailAddress;
          userName = `${signUp.firstName || ''} ${signUp.lastName || ''}`.trim();
          googleId = signUp.externalAccounts?.[0]?.providerUserId || signUp.id;
          picture = signUp.imageUrl;
        }
        // Method 2: From signIn object
        else if (signIn?.identifier) {
          userEmail = signIn.identifier;
          userName = signIn.firstName || signIn.identifier.split('@')[0];
          googleId = signIn.id;
          picture = signIn.imageUrl;
        }
        // Method 3: From createdSessionId userData (for returning users)
        else if (signUp?.createdUserId || signIn?.createdSessionId) {
          // Wait a moment for the session to be fully activated
          await new Promise(resolve => setTimeout(resolve, 500));

          // The clerkUser should be updated now
          if (clerkUser) {
            userEmail = clerkUser.primaryEmailAddress?.emailAddress;
            userName = clerkUser.fullName || clerkUser.firstName;
            googleId = clerkUser.externalAccounts?.[0]?.providerUserId || clerkUser.id;
            picture = clerkUser.imageUrl;
          }
        }

        // Fallback: Try to get from external accounts
        if (!userEmail) {
          const externalAccount = signUp?.externalAccounts?.[0] || signIn?.externalAccounts?.[0];
          if (externalAccount) {
            userEmail = externalAccount.emailAddress;
            userName = `${externalAccount.firstName || ''} ${externalAccount.lastName || ''}`.trim();
            googleId = externalAccount.providerUserId;
            picture = externalAccount.imageUrl;
          }
        }

        if (!userEmail) {
          console.error("Could not extract email. Full response:", JSON.stringify({ signIn, signUp }, null, 2));
          Alert.alert("Error", "Could not get email from Google account. Please try again.");
          return;
        }

        if (!userName || userName.trim() === '') {
          userName = userEmail.split('@')[0];
        }

        console.log("Extracted user info:", { userEmail, userName, googleId });

        // Navigate directly to GooglePasswordScreen
        // The registration endpoint will check if email already exists
        navigation.navigate("GooglePasswordScreen", {
          googleUser: {
            name: userName,
            email: userEmail,
            googleId: googleId,
            picture: picture,
          }
        });
      }
    } catch (err) {
      console.error("OAuth error:", err);
      Alert.alert("Error", "Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [startOAuthFlow, isSignedIn, signOut, navigation, clerkUser]);


  const fetchGoogleUserInfo = async (accessToken) => {
    try {
      setLoading(true);
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const userInfo = await userInfoResponse.json();
      console.log("Google User Info:", userInfo);

      // Store google user info and show user type selection
      setGoogleUser({
        name: userInfo.name,
        email: userInfo.email,
        googleId: userInfo.id,
        picture: userInfo.picture,
      });
      setShowUserTypeModal(true);
    } catch (error) {
      console.error("Error fetching Google user info:", error);
      Alert.alert("Error", "Failed to get Google user info");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!googleUser) return;

    setLoading(true);
    try {
      const response = await axios.post("http://192.168.172.72:5000/auth/google", {
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.googleId,
        picture: googleUser.picture,
        userType: selectedUserType,
      });

      if (response.data.success) {
        setShowUserTypeModal(false);

        // Save to AuthContext
        login({
          userId: response.data.userId,
          name: response.data.name,
          email: response.data.email,
          userType: response.data.userType,
          profileCompleted: response.data.profileCompleted || false,
        });

        // Navigate based on profile completion
        if (!response.data.profileCompleted) {
          if (selectedUserType === "patient") {
            navigation.replace("PatientProfileCompletion", { email: googleUser.email });
          } else {
            navigation.replace("ServiceProviderProfileCompletion", { email: googleUser.email });
          }
        } else {
          if (selectedUserType === "patient") {
            navigation.replace("PatientDashboard", {
              userName: response.data.name,
              userId: response.data.userId,
              userEmail: response.data.email,
            });
          } else {
            navigation.replace("ServiceProviderDashboard", {
              userName: response.data.name,
              userId: response.data.userId,
              userEmail: response.data.email,
            });
          }
        }
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (error) {
      console.error("Google register error:", error);
      Alert.alert("Error", "Failed to register with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await axios.post("http://192.168.172.72:5000/register", {
        name,
        email,
        password,
        userType,
      });

      if (response.data.success) {
        Alert.alert("Success", response.data.message);
        navigation.navigate("OtpVerifyScreen", {
          email: email,
          userType: userType
        });
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
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
        <Text style={styles.heroTitle}>Create Account</Text>
        <Text style={styles.heroSub}>Join PostJourney to get started</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Register</Text>
            <Text style={styles.cardSub}>Enter your details below</Text>

            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputGroup}>
              <MaterialCommunityIcons name="account-outline" size={20} color={C.secondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor={C.textLight}
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputGroup}>
              <MaterialCommunityIcons name="email-outline" size={20} color={C.secondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                style={styles.input}
                autoCapitalize="none"
                placeholderTextColor={C.textLight}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputGroup}>
              <MaterialCommunityIcons name="lock-outline" size={20} color={C.secondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholderTextColor={C.textLight}
              />
            </View>

            <Text style={styles.label}>User Type</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={userType}
                onValueChange={(v) => setUserType(v)}
                style={styles.picker}
              >
                <Picker.Item label="Patient" value="patient" />
                <Picker.Item label="Service Provider" value="service-provider" />
              </Picker>
            </View>

            {/* REGISTER BUTTON */}
            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>REGISTER</Text>
              )}
            </TouchableOpacity>

            {/* Google Sign In */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <MaterialCommunityIcons name="google" size={22} color="#DB4437" style={{ marginRight: 10 }} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity onPress={() => navigation.navigate("LoginScreen")} style={styles.linkRow}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkAccent}>Login</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('AdminLoginScreen')} style={styles.adminRow}>
              <Text style={styles.adminText}>Admin Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* User Type Selection Modal for Google Sign-In */}
      <Modal
        visible={showUserTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="account-check-outline" size={36} color="#0A5F7A" />
            </View>
            <Text style={styles.modalTitle}>Welcome, {googleUser?.name}!</Text>
            <Text style={styles.modalSubtitle}>Please select your account type:</Text>

            <TouchableOpacity
              style={[
                styles.userTypeOption,
                selectedUserType === "patient" && styles.userTypeSelected,
              ]}
              onPress={() => setSelectedUserType("patient")}
            >
              <Text style={styles.userTypeIcon}>🏥</Text>
              <Text style={[styles.userTypeText, selectedUserType === "patient" && styles.userTypeTextSelected]}>Patient</Text>
              <Text style={styles.userTypeDesc}>Book equipment & consultations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeOption,
                selectedUserType === "service-provider" && styles.userTypeSelected,
              ]}
              onPress={() => setSelectedUserType("service-provider")}
            >
              <Text style={styles.userTypeIcon}>🛠️</Text>
              <Text style={[styles.userTypeText, selectedUserType === "service-provider" && styles.userTypeTextSelected]}>Service Provider</Text>
              <Text style={styles.userTypeDesc}>Provide equipment & services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleGoogleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowUserTypeModal(false);
                setGoogleUser(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Please wait...</Text>
        </View>
      )}
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
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: C.textDark, fontWeight: "500" },
  pickerWrapper: { width: "100%", backgroundColor: C.bg, borderRadius: 12, marginBottom: 18, overflow: "hidden", borderWidth: 1, borderColor: C.cardBorder },
  picker: { height: 48, width: "100%", color: C.textDark },
  btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 10, marginBottom: 20 },
  btnDisabled: { backgroundColor: C.textLight },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
  divider: { flexDirection: "row", alignItems: "center", width: "100%", marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.cardBorder },
  dividerText: { marginHorizontal: 15, color: C.textLight, fontWeight: "700", fontSize: 13 },
  googleButton: { flexDirection: "row", width: "100%", backgroundColor: "#fff", paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: C.cardBorder, elevation: 2, marginBottom: 16 },
  googleButtonText: { fontSize: 15, fontWeight: "700", color: C.textDark },
  linkRow: { alignItems: "center", marginBottom: 12 },
  linkText: { fontSize: 14, color: C.textMid, fontWeight: "500" },
  linkAccent: { color: C.primary, fontWeight: "700" },
  adminRow: { alignItems: "center", paddingTop: 4 },
  adminText: { fontSize: 13, color: C.textLight, fontWeight: "600", textDecorationLine: "underline" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: "white", borderRadius: 22, padding: 28, width: "100%", maxWidth: 360, alignItems: "center" },
  modalIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E0F2F7", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: C.textDark, marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: C.textMid, marginBottom: 20 },
  userTypeOption: { width: "100%", backgroundColor: C.bg, padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 2, borderColor: "transparent" },
  userTypeSelected: { borderColor: C.primary, backgroundColor: "#E0F2F7" },
  userTypeIcon: { fontSize: 28, textAlign: "center", marginBottom: 5 },
  userTypeText: { fontSize: 16, fontWeight: "bold", textAlign: "center", color: C.textDark },
  userTypeTextSelected: { color: C.primary },
  userTypeDesc: { fontSize: 12, textAlign: "center", color: C.textMid, marginTop: 3 },
  continueButton: { width: "100%", backgroundColor: C.primary, paddingVertical: 15, borderRadius: 14, marginTop: 15, alignItems: "center", elevation: 4 },
  continueButtonText: { color: "white", fontWeight: "800", fontSize: 16 },
  cancelButton: { marginTop: 12, padding: 10 },
  cancelButtonText: { color: C.textMid, fontSize: 14, fontWeight: "600" },
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.85)", justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: C.textDark, fontSize: 16, fontWeight: "600" },
});