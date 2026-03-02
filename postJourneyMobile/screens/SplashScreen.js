import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Dimensions, View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const { user, isLoading } = useAuth();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start(() => { if (!isLoading) handleNavigation(); });
  }, []);

  useEffect(() => {
    if (!isLoading) setTimeout(() => handleNavigation(), 600);
  }, [isLoading, user]);

  const handleNavigation = () => {
    if (user && user.userId) {
      console.log("✅ Auto-login: User found, navigating to dashboard");
      if (user.userType === "patient") navigation.replace("PatientDashboard", { userId: user.userId, userName: user.name, userEmail: user.email });
      else if (user.userType === "service-provider" || user.userType === "service provider") navigation.replace("ServiceProviderDashboard", { userId: user.userId, userName: user.name, userEmail: user.email });
      else if (user.userType === "admin") navigation.replace("AdminDashboard");
      else navigation.replace("LoginScreen");
    } else {
      console.log("📝 No stored session, going to RegisterScreen");
      navigation.replace("RegisterScreen");
    }
  };

  return (
    <LinearGradient colors={["#0A5F7A", "#1D8FAB"]} style={styles.root}>
      <Animated.Image
        source={require("../assets/postjourney_logo.png")}
        style={[styles.logo, { opacity: fade, transform: [{ scale }] }]}
        resizeMode="contain"
      />
      <Animated.View style={{ opacity: fade }}>
        <Text style={styles.brand}>PostJourney</Text>
        <Text style={styles.tagline}>Your Recovery Partner</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: { width: width * 0.45, height: width * 0.45, marginBottom: 16 },
  brand: { fontSize: 32, fontWeight: "900", color: "#fff", textAlign: "center", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.75)", textAlign: "center", fontWeight: "500", marginTop: 4 },
});
