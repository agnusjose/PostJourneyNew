import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  StatusBar,
  ScrollView
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function ServiceProviderDashboard({ route, navigation }) {
  const { userId, userName, userEmail } = route.params || {};
  const { logout } = useAuth();
  // Ensure we have user data even if route params are missing
  const { user } = useAuth();
  const displayUser = userId ? { userId, userName, userEmail } : user;


  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            navigation.replace("LoginScreen");
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!displayUser?.userId) {
      // If still no user, try to get from context or redirect
      if (!user) {
        Alert.alert("Error", "User ID not found. Please login again.");
        navigation.replace("LoginScreen");
        return;
      }
    }
    console.log("Dashboard loaded with:", displayUser);
  }, [displayUser]);

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="dark-content" />

        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcome}>Welcome Back,</Text>
              <Text style={styles.userName}>{displayUser?.userName || "Provider"}</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate("ServiceProviderProfileScreen", {
                userId: displayUser?.userId,
                userEmail: displayUser?.userEmail,
              })}
            >
              <Text style={styles.profileButtonText}>👤</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{(displayUser?.userName || "U").charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{displayUser?.userName || "Service Provider"}</Text>
                <Text style={styles.email}>{displayUser?.userEmail || "No Email"}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statusRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.approvedText}>Account Verified</Text>
            </View>
          </View>

          {/* Action Buttons Grid */}
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                navigation.navigate("EquipmentDashboardScreen", {
                  providerId: displayUser?.userId,
                })
              }
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E0F2F7' }]}>
                <Ionicons name="medkit-outline" size={32} color="#0A5F7A" />
              </View>
              <Text style={styles.actionTitle}>Equipment</Text>
              <Text style={styles.actionSubtitle}>Manage Inventory</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                navigation.navigate("ProviderBookingsScreen", {
                  providerId: displayUser?.userId,
                })
              }
            >
              <View style={[styles.iconContainer, { backgroundColor: '#EDE7F6' }]}>
                <Ionicons name="calendar-outline" size={32} color="#7E57C2" />
              </View>
              <Text style={styles.actionTitle}>Bookings</Text>
              <Text style={styles.actionSubtitle}>View Requests</Text>
            </TouchableOpacity>

          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF5350" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(245, 250, 255, 0.85)' },

  content: {
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },

  welcome: {
    fontSize: 15,
    color: "#4A7A8C",
    fontWeight: "500",
  },

  userName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0A3D52",
    letterSpacing: -0.5,
  },

  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7E5ED',
  },

  profileButtonText: {
    fontSize: 18,
  },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    elevation: 4,
    shadowColor: "#0A3D52", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
    borderWidth: 1, borderColor: '#D7E5ED',
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#0A5F7A',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: "700", color: "#0A3D52", marginBottom: 2 },
  email: { fontSize: 14, color: "#4A7A8C" },

  divider: { height: 1, backgroundColor: "#D7E5ED", marginBottom: 12 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  approvedText: { color: "#10b981", fontWeight: "600", fontSize: 14 },

  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, marginBottom: 30
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#2C3E50", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  iconContainer: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  actionTitle: { fontSize: 16, fontWeight: "700", color: "#0A3D52", marginBottom: 2 },
  actionSubtitle: { fontSize: 12, color: "#90A4AE" },

  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: 'center',
    shadowColor: "#EF5350", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 4,
  },
  logoutText: { color: "#EF5350", fontWeight: "700", fontSize: 16 },
});
