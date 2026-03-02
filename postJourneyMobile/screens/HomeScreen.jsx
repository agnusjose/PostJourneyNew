import React from "react";
import { View, Text, StyleSheet, Image, StatusBar, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function HomeScreen({ route }) {
  const { userEmail, isAdmin } = route.params || {};
  return (
    <LinearGradient colors={["#0A5F7A", "#1D8FAB"]} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A5F7A" />
      <Image source={require("../assets/postjourney_logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.welcome}>Welcome to</Text>
      <Text style={styles.brand}>PostJourney</Text>
      {isAdmin ? (
        <Text style={styles.sub}>Admin: {userEmail}</Text>
      ) : userEmail ? (
        <Text style={styles.sub}>Logged in as: {userEmail}</Text>
      ) : (
        <Text style={styles.sub}>Your recovery journey starts here</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: Platform.OS === "ios" ? 40 : 24 },
  logo: { width: 120, height: 120, marginBottom: 20 },
  welcome: { fontSize: 20, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginBottom: 4 },
  brand: { fontSize: 42, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  sub: { marginTop: 16, fontSize: 16, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
});
