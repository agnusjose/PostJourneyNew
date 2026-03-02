import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";

const BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://192.168.172.72:5000";

const C = {
  primary: "#0A5F7A",
  secondary: "#1D8FAB",
  accent: "#2EC4B6",
  surface: "#FFFFFF",
  bg: "#F0F6F9",
  textDark: "#0D2535",
  textMid: "#4A6B7C",
  textLight: "#8BA9B8",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  cardBorder: "#DBE8EE",
};

export default function AdminDashboard({ navigation }) {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await axios.get(`${BASE_URL}/admin/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
        setRecentUsers(response.data.recentUsers || []);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  useEffect(() => {
    const backAction = () => {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () =>
            navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] }),
        },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [navigation]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () =>
          navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] }),
      },
    ]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const getUserTypeIcon = (type) => {
    if (type === "patient") return "account-heart";
    if (type === "service-provider" || type === "service provider")
      return "stethoscope";
    return "shield-account";
  };

  const getUserTypeBadgeColor = (type) => {
    if (type === "patient") return C.secondary;
    if (type === "service-provider" || type === "service provider")
      return C.accent;
    return C.primary;
  };

  // ========== RENDER ===========

  const StatCard = ({ icon, label, value, color, bgColor, onPress }) => (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIconWrap, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{loading ? "—" : value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={[styles.statAccent, { backgroundColor: color }]} />
    </TouchableOpacity>
  );

  const QUICK_ACTIONS = [
    { icon: "account-multiple", label: "Patients", color: C.secondary, bg: "#E0F2F7", screen: "AdminUsersScreen" },
    { icon: "stethoscope", label: "Providers", color: "#7C3AED", bg: "#F3EEFF", screen: "ManageProviders" },
    { icon: "doctor", label: "Doctors", color: "#059669", bg: "#ECFDF5", screen: "ManageDoctors" },
    { icon: "flag-outline", label: "Complaints", color: "#DC6803", bg: "#FFF7ED", screen: "AdminComplaintsScreen" },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Hero Header */}
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.greeting}>Welcome Back 👋</Text>
            <Text style={styles.heroName}>Admin Panel</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout-variant" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="account-group" size={18} color={C.accent} />
            <Text style={styles.statusLabel}>Patients</Text>
            <Text style={styles.statusValue}>{loading ? "—" : stats?.totalPatients ?? 0}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="hospital-building" size={18} color={C.accent} />
            <Text style={styles.statusLabel}>Providers</Text>
            <Text style={styles.statusValue}>{loading ? "—" : stats?.totalProviders ?? 0}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="clock-alert-outline" size={18} color={C.accent} />
            <Text style={styles.statusLabel}>Pending</Text>
            <Text style={styles.statusValue}>{loading ? "—" : stats?.pendingVerifications ?? 0}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStats(true)}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* Stats Grid */}
        <SectionHeader title="Overview" icon="chart-box-outline" />
        <View style={styles.statsGrid}>
          <StatCard
            icon="account-group"
            label="Patients"
            value={stats?.totalPatients}
            color={C.secondary}
            bgColor="#E0F2F7"
            onPress={() => navigation.navigate("AdminUsersScreen")}
          />
          <StatCard
            icon="hospital-building"
            label="Providers"
            value={stats?.totalProviders}
            color="#7C3AED"
            bgColor="#F3EEFF"
            onPress={() => navigation.navigate("ManageProviders")}
          />
          <StatCard
            icon="doctor"
            label="Doctors"
            value={stats?.totalDoctors}
            color={C.primary}
            bgColor="#E6F3F7"
            onPress={() => navigation.navigate("ManageDoctors")}
          />
          <StatCard
            icon="clock-alert-outline"
            label="Pending"
            value={stats?.pendingVerifications}
            color={C.warning}
            bgColor="#FEF3C7"
            onPress={() => navigation.navigate("AdminPendingApprovalsScreen")}
          />
          <StatCard
            icon="package-variant-closed"
            label="Bookings"
            value={stats?.totalBookings}
            color={C.success}
            bgColor="#D1FAE5"
            onPress={() => navigation.navigate("AdminBookingsScreen")}
          />
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" icon="lightning-bolt" />
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.screen}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                <MaterialCommunityIcons name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <View style={[styles.actionArrow, { backgroundColor: action.bg }]}>
                <MaterialCommunityIcons name="arrow-right" size={12} color={action.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <SectionHeader title="Recent Registrations" icon="clock-outline" />
        <View style={styles.recentCard}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={C.primary}
              style={{ padding: 30 }}
            />
          ) : recentUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="account-off-outline"
                size={40}
                color={C.textLight}
              />
              <Text style={styles.emptyText}>No users yet</Text>
            </View>
          ) : (
            recentUsers.map((user, index) => (
              <TouchableOpacity
                key={user._id}
                style={[
                  styles.recentItem,
                  index < recentUsers.length - 1 && styles.recentItemBorder,
                ]}
                onPress={() =>
                  navigation.navigate("AdminUserDetailsScreen", {
                    userId: user._id,
                    userType: user.userType,
                  })
                }
                activeOpacity={0.6}
              >
                <View
                  style={[
                    styles.userAvatar,
                    {
                      backgroundColor:
                        getUserTypeBadgeColor(user.userType) + "20",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={getUserTypeIcon(user.userType)}
                    size={20}
                    color={getUserTypeBadgeColor(user.userType)}
                  />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={styles.userMeta}>
                  <Text style={styles.userTime}>
                    {formatDate(user.createdAt)}
                  </Text>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          getUserTypeBadgeColor(user.userType) + "18",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: getUserTypeBadgeColor(user.userType) },
                      ]}
                    >
                      {user.userType === "service-provider" ||
                        user.userType === "service provider"
                        ? "Provider"
                        : user.userType === "patient"
                          ? "Patient"
                          : "Admin"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={16} color={C.secondary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight || 24) + 16,
    paddingBottom: 28,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  greeting: {
    fontSize: 13, color: "rgba(255,255,255,0.75)",
    fontWeight: "500", letterSpacing: 0.4, marginBottom: 4,
  },
  heroName: {
    fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5,
  },
  logoutBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },

  // Status strip
  statusStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statusItem: { flex: 1, alignItems: "center", gap: 2 },
  statusDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  statusLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600", marginTop: 3 },
  statusValue: { fontSize: 12, color: "#fff", fontWeight: "700" },

  // Body
  body: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 50 },

  // Section header
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: "800", color: C.textDark, letterSpacing: 0.2,
  },

  // Stats
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 26,
  },
  statCard: {
    width: "47%",
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    elevation: 2,
    shadowColor: C.textDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    overflow: "hidden",
  },
  statIconWrap: {
    width: 42, height: 42, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  statValue: {
    fontSize: 28, fontWeight: "800", color: C.textDark, letterSpacing: -1,
  },
  statLabel: {
    fontSize: 13, color: C.textMid, fontWeight: "500", marginTop: 2,
  },
  statAccent: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
  },

  // Quick Actions grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 26,
  },
  actionCard: {
    width: "47%",
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    elevation: 2,
    shadowColor: C.textDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  actionIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14, fontWeight: "800", color: C.textDark,
    marginBottom: 10, letterSpacing: 0.1,
  },
  actionArrow: {
    width: 22, height: 22, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
  },

  // Recent Activity
  recentCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.cardBorder,
    elevation: 2,
    shadowColor: C.textDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  userAvatar: {
    width: 42, height: 42, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: C.textDark },
  userEmail: { fontSize: 12, color: C.textLight, marginTop: 2 },
  userMeta: { alignItems: "flex-end" },
  userTime: { fontSize: 11, color: C.textLight, marginBottom: 4 },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5,
  },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { marginTop: 8, color: C.textLight, fontSize: 14 },
});
