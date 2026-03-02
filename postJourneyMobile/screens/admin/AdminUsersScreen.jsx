import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TouchableOpacity, Alert, Platform, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";

const C = {
  primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9",
  textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8",
  cardBorder: "#DBE8EE", success: "#10B981", danger: "#EF4444", warning: "#F59E0B",
};

export default function AdminUsersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);

  const BASE_URL = Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://192.168.172.72:5000";

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching patients from:", `${BASE_URL}/admin/patients`);
      const response = await axios.get(`${BASE_URL}/admin/patients`);
      console.log("Patients response:", response.data);
      if (response.data.success) {
        setPatients(response.data.users);
      } else {
        setError("Failed to fetch patients");
      }
    } catch (err) {
      console.error("Fetch patients error:", err);
      setError(err.message);
      Alert.alert("Error", "Failed to fetch patients. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const toggleBlock = async (id, currentStatus) => {
    try {
      await axios.patch(`${BASE_URL}/admin/users/${id}/block`, { isBlocked: !currentStatus });
      Alert.alert("Success", "User status updated");
      fetchPatients();
    } catch (err) {
      console.error("Toggle block error:", err);
      Alert.alert("Error", "Unable to update user block status. Check if endpoint exists.");
    }
  };

  const deleteUser = (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(`${BASE_URL}/admin/users/${id}`);
            Alert.alert("Success", "User deleted");
            fetchPatients();
          } catch (err) {
            console.error(err);
            Alert.alert("Error", "Unable to delete user. Check if endpoint exists.");
          }
        },
      },
    ]);
  };

  const renderPatient = ({ item }) => {
    const createdDate = new Date(item.createdAt).toLocaleDateString();
    const isBlocked = item.isBlocked;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("AdminUserDetailsScreen", { userId: item._id, userType: item.userType })}
        activeOpacity={0.75}
      >
        {/* Avatar + Name row */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{(item.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isBlocked ? "#FEE2E2" : "#D1FAE5" }]}>
            <View style={[styles.statusDot, { backgroundColor: isBlocked ? C.danger : C.success }]} />
            <Text style={[styles.statusText, { color: isBlocked ? C.danger : C.success }]}>
              {isBlocked ? "Blocked" : "Active"}
            </Text>
          </View>
        </View>

        {/* Details row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="account-tag-outline" size={12} color={C.secondary} />
            <Text style={styles.detailChipText}>{item.userType}</Text>
          </View>
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name={item.isVerified ? "shield-check" : "shield-off-outline"} size={12} color={item.isVerified ? C.success : C.textLight} />
            <Text style={[styles.detailChipText, { color: item.isVerified ? C.success : C.textLight }]}>
              {item.isVerified ? "Verified" : "Unverified"}
            </Text>
          </View>
          <Text style={styles.dateText}>Joined: {createdDate}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isBlocked ? "#D1FAE5" : "#FEF3C7", borderColor: isBlocked ? C.success : C.warning }]}
            onPress={() => toggleBlock(item._id, item.isBlocked)}
          >
            <MaterialCommunityIcons name={isBlocked ? "lock-open-outline" : "lock-outline"} size={14} color={isBlocked ? C.success : C.warning} />
            <Text style={[styles.actionText, { color: isBlocked ? C.success : C.warning }]}>
              {isBlocked ? "Unblock" : "Block"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#FEE2E2", borderColor: C.danger }]}
            onPress={() => deleteUser(item._id)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.danger} />
            <Text style={[styles.actionText, { color: C.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={C.danger} />
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPatients}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (patients.length === 0) {
      return (
        <View style={styles.center}>
          <MaterialCommunityIcons name="account-group-outline" size={52} color={C.textLight} />
          <Text style={styles.emptyText}>No patients found</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={patients}
        keyExtractor={(item) => item._id}
        renderItem={renderPatient}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroCenter}>
          <Text style={styles.heroTitle}>Manage Patients</Text>
          <Text style={styles.heroSub}>{patients.length} registered patients</Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={fetchPatients}>
          <MaterialCommunityIcons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.container}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12,
    paddingBottom: 16, paddingHorizontal: 18,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  heroCenter: { flex: 1, alignItems: "center" },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 2 },
  refreshIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },

  container: { flex: 1, paddingHorizontal: 16 },
  list: { paddingTop: 16, paddingBottom: 30 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { color: C.textLight, fontWeight: "600", fontSize: 14 },
  errorText: { color: C.danger, fontWeight: "600", fontSize: 14, textAlign: "center" },
  emptyText: { color: C.textLight, fontWeight: "600", fontSize: 15 },
  retryBtn: { backgroundColor: C.primary, paddingVertical: 10, paddingHorizontal: 28, borderRadius: 12 },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.cardBorder,
    elevation: 2, shadowColor: C.textDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E6F3F7", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarLetter: { fontSize: 18, fontWeight: "800", color: C.primary },
  cardMeta: { flex: 1 },
  name: { fontSize: 15, fontWeight: "800", color: C.textDark, marginBottom: 2 },
  email: { fontSize: 12, color: C.textMid, fontWeight: "500" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },

  detailsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  detailChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder },
  detailChipText: { fontSize: 11, fontWeight: "600", color: C.secondary },
  dateText: { fontSize: 11, color: C.textLight, fontWeight: "500", marginLeft: "auto" },

  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actionText: { fontWeight: "700", fontSize: 13 },
});
