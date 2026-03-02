import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";

const C = {
  primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
  bg: "#F0F6F9", surface: "#FFFFFF",
  textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8",
  cardBorder: "#DBE8EE", success: "#10B981", danger: "#EF4444", warning: "#F59E0B",
};

export default function ManageProviders({ navigation }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const BASE_URL = Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://192.168.172.72:5000";

  // Fetch providers function
  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching providers from:", `${BASE_URL}/admin/providers`);
      const response = await axios.get(`${BASE_URL}/admin/providers`);
      console.log("Providers response:", response.data);

      if (response.data.success) {
        setProviders(response.data.users);
      } else {
        setError("Failed to fetch providers");
      }
    } catch (err) {
      console.error("Fetch providers error:", err);
      setError(err.message);
      Alert.alert("Error", "Failed to fetch providers. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // ✅ UPDATED: Block/Unblock provider - CORRECT ENDPOINT
  const toggleBlockProvider = async (id, isCurrentlyBlocked) => {
    try {
      const action = isCurrentlyBlocked ? "unblock" : "block";

      // CORRECT ENDPOINT: /admin/users/:id/block
      const response = await axios.patch(`${BASE_URL}/admin/users/${id}/block`, {
        isBlocked: !isCurrentlyBlocked
      });

      if (response.data.success) {
        Alert.alert("Success", `Provider ${action}ed successfully`);
        fetchProviders(); // Refresh list
      } else {
        Alert.alert("Error", response.data.message || "Failed to update provider");
      }
    } catch (err) {
      console.error("Block provider error:", err);
      Alert.alert("Error", "Unable to update provider status");
    }
  };

  // ✅ UPDATED: Delete provider - CORRECT ENDPOINT
  const deleteProvider = async (id, name) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // CORRECT ENDPOINT: /admin/users/:id
              const response = await axios.delete(`${BASE_URL}/admin/users/${id}`);

              if (response.data.success) {
                Alert.alert("Success", "Provider deleted successfully");
                fetchProviders(); // Refresh list
              } else {
                Alert.alert("Error", response.data.message || "Failed to delete provider");
              }
            } catch (err) {
              console.error("Delete provider error:", err);
              Alert.alert("Error", "Unable to delete provider");
            }
          }
        }
      ]
    );
  };

  // ✅ UPDATED: Verify provider with strict rejection logic
  const verifyProvider = async (id, status, reason = "") => {
    try {
      // CORRECT ENDPOINT: /admin/providers/:id/verify
      const endpoint = `${BASE_URL}/admin/providers/${id}/verify`;

      if (status === "rejected") {
        // For rejection, ask if they want to delete or just reject
        Alert.alert(
          "Reject Provider",
          "Choose action:",
          [
            {
              text: "Just Reject (User stays but cannot login)",
              onPress: async () => {
                try {
                  const response = await axios.patch(endpoint, {
                    status: "rejected",
                    reason,
                    autoDelete: false
                  });

                  if (response.data.success) {
                    Alert.alert(
                      "Provider Rejected",
                      "User marked as rejected. They cannot login but account remains."
                    );
                    fetchProviders(); // Refresh list
                  }
                } catch (err) {
                  console.error("Reject error:", err);
                  Alert.alert("Error", "Unable to reject provider");
                }
              }
            },
            {
              text: "Reject & Delete (Remove from system)",
              style: "destructive",
              onPress: async () => {
                try {
                  const response = await axios.patch(endpoint, {
                    status: "rejected",
                    reason,
                    autoDelete: true
                  });

                  if (response.data.success) {
                    Alert.alert(
                      "Provider Rejected & Deleted",
                      "User has been removed from the system."
                    );
                    fetchProviders(); // Refresh list
                  }
                } catch (err) {
                  console.error("Delete error:", err);
                  Alert.alert("Error", "Unable to delete provider");
                }
              }
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
      } else {
        // For approval
        const response = await axios.patch(endpoint, {
          status: "approved"
        });

        if (response.data.success) {
          Alert.alert("Success", "Provider approved successfully");
          fetchProviders(); // Refresh list
        } else {
          Alert.alert("Error", response.data.message || "Failed to approve provider");
        }
      }
    } catch (err) {
      console.error("Verify provider error:", err);
      console.error("Error details:", err.response?.data);
      Alert.alert(
        "Error",
        err.response?.data?.message || "Unable to update provider status"
      );
    }
  };

  // ✅ SIMPLIFIED: Approve provider function
  const approveProvider = async (id) => {
    Alert.alert(
      "Approve Provider",
      "Are you sure you want to approve this provider?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              const response = await axios.patch(
                `${BASE_URL}/admin/providers/${id}/verify`,
                { status: "approved" }
              );

              if (response.data.success) {
                Alert.alert("Success", "Provider approved successfully");
                fetchProviders(); // Refresh list
              } else {
                Alert.alert("Error", response.data.message || "Failed to approve");
              }
            } catch (err) {
              console.error("Approve error:", err);
              Alert.alert("Error", "Unable to approve provider");
            }
          }
        }
      ]
    );
  };

  // ✅ UPDATED: Reject with modal (now with option to delete or just reject)
  const openRejectModal = (provider) => {
    setSelectedProvider(provider);
    setRejectReason("");
    setModalVisible(true);
  };

  // ✅ UPDATED: Confirm rejection with options
  const confirmRejection = () => {
    if (!rejectReason.trim()) {
      Alert.alert("Error", "Please provide a reason for rejection");
      return;
    }

    Alert.alert(
      "Reject Provider",
      `Choose action for ${selectedProvider?.name}:`,
      [
        {
          text: "Just Reject (Cannot login)",
          onPress: async () => {
            try {
              const response = await axios.patch(
                `${BASE_URL}/admin/providers/${selectedProvider._id}/verify`,
                {
                  status: "rejected",
                  reason: rejectReason,
                  autoDelete: false
                }
              );

              if (response.data.success) {
                Alert.alert(
                  "Provider Rejected",
                  "User marked as rejected. They cannot login."
                );
                fetchProviders(); // Refresh list
                setModalVisible(false);
              }
            } catch (err) {
              console.error("Reject error:", err);
              Alert.alert("Error", "Unable to reject provider");
            }
          }
        },
        {
          text: "Reject & Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axios.patch(
                `${BASE_URL}/admin/providers/${selectedProvider._id}/verify`,
                {
                  status: "rejected",
                  reason: rejectReason,
                  autoDelete: true
                }
              );

              if (response.data.success) {
                Alert.alert(
                  "Provider Rejected & Deleted",
                  "User has been removed from the system."
                );
                fetchProviders(); // Refresh list
                setModalVisible(false);
              }
            } catch (err) {
              console.error("Delete error:", err);
              Alert.alert("Error", "Unable to delete provider");
            }
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  // Filter providers based on active tab
  const filteredProviders = providers.filter(p => {
    if (activeTab === "all") return true;
    const st = p.providerProfile?.serviceType || "";
    if (activeTab === "caregiver") return st === "caregiver";
    if (activeTab === "equipment") return st === "equipment";
    return true;
  });

  const getServiceTypeBadge = (serviceType) => {
    if (serviceType === "caregiver") {
      return { label: "Caregiver", color: "#7C3AED", bg: "#F3EEFF", icon: "hand-heart" };
    } else if (serviceType === "equipment") {
      return { label: "Equipment", color: "#DC6803", bg: "#FFF7ED", icon: "medical-bag" };
    }
    return { label: "Unknown", color: C.textLight, bg: C.bg, icon: "help-circle-outline" };
  };

  const getVerificationColor = (status) => {
    if (status === "approved") return C.success;
    if (status === "rejected") return C.danger;
    return C.warning;
  };

  const renderProvider = ({ item }) => {
    const serviceType = item.providerProfile?.serviceType || "";
    const badge = getServiceTypeBadge(serviceType);
    const verStatus = item.providerProfile?.verification?.status || "pending";

    return (
      <TouchableOpacity
        style={[styles.card, item.isBlocked && styles.blockedCard]}
        onPress={() => navigation.navigate("AdminUserDetailsScreen", { userId: item._id, userType: item.userType })}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.avatarCircle, item.isBlocked && { backgroundColor: "#FEE2E2" }]}>
              <MaterialCommunityIcons name={badge.icon} size={20} color={item.isBlocked ? C.danger : badge.color} />
            </View>
            <View style={styles.nameCol}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
          </View>
          <View style={styles.statusBadges}>
            {item.isBlocked && (
              <View style={styles.blockedBadge}>
                <MaterialCommunityIcons name="lock-outline" size={10} color="#fff" />
                <Text style={styles.blockedText}>BLOCKED</Text>
              </View>
            )}
            <View style={[styles.verBadge, { backgroundColor: getVerificationColor(verStatus) + "18" }]}>
              <Text style={[styles.verText, { color: getVerificationColor(verStatus) }]}>
                {verStatus.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.serviceTypeBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.serviceTypeBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsStrip}>
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="shield-check-outline" size={12} color={getVerificationColor(verStatus)} />
            <Text style={[styles.detailChipText, { color: getVerificationColor(verStatus) }]}>
              {verStatus.toUpperCase()}
            </Text>
          </View>
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="email-check-outline" size={12} color={item.isVerified ? C.success : C.textLight} />
            <Text style={styles.detailChipText}>
              {item.isVerified ? "Verified" : "Unverified"}
            </Text>
          </View>
          <View style={styles.detailChip}>
            <MaterialCommunityIcons name="calendar-outline" size={12} color={C.textLight} />
            <Text style={styles.detailChipText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Action Buttons Row 1: Verification */}
        <View style={styles.actions}>
          {item.providerProfile?.verification?.status !== "approved" ? (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#D1FAE5", borderColor: C.success }]}
                onPress={() => approveProvider(item._id)}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={14} color={C.success} />
                <Text style={[styles.btnText, { color: C.success }]}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#FEE2E2", borderColor: C.danger }]}
                onPress={() => openRejectModal(item)}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={14} color={C.danger} />
                <Text style={[styles.btnText, { color: C.danger }]}>Reject</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.btn, { backgroundColor: "#D1FAE5", borderColor: C.success, flex: 2 }]}>
              <MaterialCommunityIcons name="check-decagram" size={14} color={C.success} />
              <Text style={[styles.btnText, { color: C.success }]}>Verified & Approved</Text>
            </View>
          )}
        </View>

        {/* Action Buttons Row 2: Block & Delete */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, {
              backgroundColor: item.isBlocked ? "#E6F3F7" : "#FEF3C7",
              borderColor: item.isBlocked ? C.secondary : C.warning,
            }]}
            onPress={() => toggleBlockProvider(item._id, item.isBlocked)}
          >
            <MaterialCommunityIcons
              name={item.isBlocked ? "lock-open-outline" : "lock-outline"}
              size={14}
              color={item.isBlocked ? C.secondary : C.warning}
            />
            <Text style={[styles.btnText, { color: item.isBlocked ? C.secondary : C.warning }]}>
              {item.isBlocked ? "Unblock" : "Block"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: C.bg, borderColor: C.cardBorder }]}
            onPress={() => deleteProvider(item._id, item.name)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.textMid} />
            <Text style={[styles.btnText, { color: C.textMid }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroCenter}>
            <Text style={styles.heroTitle}>Manage Providers</Text>
            <Text style={styles.heroSub}>Loading...</Text>
          </View>
          <View style={{ width: 36 }} />
        </LinearGradient>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading service providers...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroCenter}>
            <Text style={styles.heroTitle}>Manage Providers</Text>
          </View>
          <View style={{ width: 36 }} />
        </LinearGradient>
        <View style={styles.center}>
          <MaterialCommunityIcons name="alert-circle-outline" size={44} color={C.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtnWrap} onPress={fetchProviders}>
            <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Hero Header */}
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroCenter}>
          <Text style={styles.heroTitle}>Manage Providers</Text>
          <Text style={styles.heroSub}>{providers.length} providers</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtnWrap} onPress={fetchProviders}>
          <MaterialCommunityIcons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Status Strip */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <View style={[styles.statDot, { backgroundColor: C.success }]} />
          <Text style={styles.statText}>Approved: {providers.filter(p => p.providerProfile?.verification?.status === "approved").length}</Text>
        </View>
        <View style={styles.statChip}>
          <View style={[styles.statDot, { backgroundColor: C.warning }]} />
          <Text style={styles.statText}>Pending: {providers.filter(p => !p.providerProfile?.verification?.status || p.providerProfile?.verification?.status === "pending").length}</Text>
        </View>
        <View style={styles.statChip}>
          <View style={[styles.statDot, { backgroundColor: C.danger }]} />
          <Text style={styles.statText}>Blocked: {providers.filter(p => p.isBlocked).length}</Text>
        </View>
      </View>

      {/* Tab Filter */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "all" && styles.activeTab]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.activeTabText]}>
            All ({providers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "caregiver" && [styles.activeTab, { backgroundColor: "#7C3AED" }]]}
          onPress={() => setActiveTab("caregiver")}
        >
          <Text style={[styles.tabText, activeTab === "caregiver" && styles.activeTabText]}>
            Caregivers ({providers.filter(p => p.providerProfile?.serviceType === "caregiver").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "equipment" && [styles.activeTab, { backgroundColor: "#DC6803" }]]}
          onPress={() => setActiveTab("equipment")}
        >
          <Text style={[styles.tabText, activeTab === "equipment" && styles.activeTabText]}>
            Equipment ({providers.filter(p => p.providerProfile?.serviceType === "equipment").length})
          </Text>
        </TouchableOpacity>
      </View>

      {filteredProviders.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="account-off-outline" size={52} color={C.textLight} />
          <Text style={styles.emptyText}>
            {activeTab === "all" ? "No service providers found" :
              activeTab === "caregiver" ? "No caregiver providers found" :
                "No equipment providers found"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => item._id}
          renderItem={renderProvider}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Rejection Reason Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Reject Provider</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={C.textMid} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {selectedProvider?.name} ({selectedProvider?.email})
            </Text>

            <View style={styles.optionsContainer}>
              <View style={styles.optionCard}>
                <View style={styles.optionHeader}>
                  <MaterialCommunityIcons name="account-lock-outline" size={16} color={C.warning} />
                  <Text style={styles.optionTitle}>Option 1: Just Reject</Text>
                </View>
                <Text style={styles.optionDescription}>
                  • User stays in system{'\n'}• Cannot login{'\n'}• Status: Rejected
                </Text>
              </View>

              <View style={[styles.optionCard, styles.deleteOption]}>
                <View style={styles.optionHeader}>
                  <MaterialCommunityIcons name="account-remove-outline" size={16} color={C.danger} />
                  <Text style={styles.optionTitle}>Option 2: Reject & Delete</Text>
                </View>
                <Text style={styles.optionDescription}>
                  • User removed from system{'\n'}• Cannot login{'\n'}• Permanent deletion
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for rejection (required)..."
              placeholderTextColor={C.textLight}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.rejectBtnModal]}
                onPress={confirmRejection}
                disabled={!rejectReason.trim()}
              >
                <Text style={styles.rejectBtnText}>Choose Action</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12,
    paddingBottom: 16, paddingHorizontal: 18,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  heroCenter: { flex: 1, alignItems: "center" },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 2 },
  refreshBtnWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },

  // Stats Row
  statsRow: {
    flexDirection: "row", justifyContent: "space-around",
    backgroundColor: C.surface, padding: 12, marginHorizontal: 16,
    marginTop: 14, borderRadius: 14,
    borderWidth: 1, borderColor: C.cardBorder,
    elevation: 2, shadowColor: C.textDark,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  statChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statText: { fontSize: 11, fontWeight: "700", color: C.textDark },

  // Tabs
  tabContainer: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 8, marginTop: 12,
    backgroundColor: C.surface, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10,
  },
  activeTab: {
    backgroundColor: C.primary,
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
  },
  tabText: { fontSize: 11, fontWeight: "700", color: C.textMid },
  activeTabText: { color: "#fff" },

  // Card
  card: {
    backgroundColor: C.surface, padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.cardBorder,
    elevation: 2, shadowColor: C.textDark,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8,
  },
  blockedCard: {
    borderColor: "#FECACA", borderLeftWidth: 4, borderLeftColor: C.danger,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardHeaderLeft: { flexDirection: "row", flex: 1, alignItems: "center" },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "#E6F3F7", justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  nameCol: { flex: 1, marginRight: 10 },
  name: { fontSize: 15, fontWeight: "800", color: C.textDark },
  email: { fontSize: 12, color: C.textLight, fontWeight: "500", marginTop: 2 },
  statusBadges: { flexDirection: "column", alignItems: "flex-end", gap: 4 },
  blockedBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: C.danger, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  blockedText: { color: "white", fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  verBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  verText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  serviceTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  serviceTypeBadgeText: { fontSize: 10, fontWeight: "700" },

  detailsStrip: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    paddingVertical: 10, marginBottom: 10,
    borderTopWidth: 1, borderTopColor: C.cardBorder,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  detailChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailChipText: { fontSize: 11, color: C.textMid, fontWeight: "600" },

  actions: { flexDirection: "row", marginTop: 6, gap: 8 },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, padding: 10, borderRadius: 12, borderWidth: 1,
  },
  btnText: { fontWeight: "700", fontSize: 12 },

  // States
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: C.textLight, fontWeight: "600" },
  errorText: { color: C.danger, fontWeight: "600", fontSize: 14, textAlign: "center" },
  retryBtnWrap: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  retryText: { color: "white", fontWeight: "700" },
  emptyText: { fontSize: 14, color: C.textLight, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20,
  },
  modalContent: {
    backgroundColor: C.surface, borderRadius: 20, padding: 22, width: "100%", maxWidth: 400,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: C.textDark },
  modalSubtitle: { fontSize: 13, color: C.textMid, marginBottom: 14 },
  optionsContainer: { marginBottom: 14, gap: 8 },
  optionCard: {
    backgroundColor: C.bg, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  deleteOption: { backgroundColor: "#FFF5F5", borderColor: "#FECACA" },
  optionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  optionTitle: { fontWeight: "800", fontSize: 13, color: C.textDark },
  optionDescription: { fontSize: 11, color: C.textMid, lineHeight: 16 },
  reasonInput: {
    borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 14,
    fontSize: 14, minHeight: 90, marginBottom: 18, textAlignVertical: "top",
    backgroundColor: C.bg, color: C.textDark,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center" },
  cancelBtn: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder },
  cancelBtnText: { color: C.textMid, fontWeight: "700" },
  rejectBtnModal: { backgroundColor: C.danger },
  rejectBtnText: { color: "white", fontWeight: "700" },
});
