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
    Image,
    ScrollView,
    Linking,
    StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
    bg: "#F0F6F9", surface: "#FFFFFF",
    textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8",
    cardBorder: "#DBE8EE", success: "#10B981", danger: "#EF4444", warning: "#F59E0B",
};

export default function AdminPendingApprovalsScreen({ navigation }) {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const BASE_URL = Platform.OS === "web"
        ? "http://localhost:5000"
        : "http://192.168.172.72:5000";

    const fetchPendingProviders = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${BASE_URL}/admin/providers`);
            if (response.data.success) {
                const pending = response.data.users.filter(p =>
                    !p.providerProfile?.verification?.status ||
                    p.providerProfile?.verification?.status === "pending"
                );
                setProviders(pending);
            } else {
                setError("Failed to fetch pending providers");
            }
        } catch (err) {
            console.error("Fetch pending error:", err);
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingProviders();
    }, []);

    const approveProvider = async (userId) => {
        Alert.alert(
            "Confirm Approval",
            "Assign verification badge and approve this service provider?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve",
                    onPress: async () => {
                        try {
                            setVerifying(true);
                            const response = await axios.patch(`${BASE_URL}/admin/providers/${userId}/verify`, {
                                status: "approved"
                            });

                            if (response.data.success) {
                                Alert.alert("Success", "Provider approved!");
                                fetchPendingProviders();
                            }
                        } catch (err) {
                            Alert.alert("Error", "Action failed");
                        } finally {
                            setVerifying(false);
                        }
                    }
                }
            ]
        );
    };

    const openRejectModal = (provider) => {
        setSelectedProvider(provider);
        setRejectReason("");
        setModalVisible(true);
    };

    const openDetailsModal = (provider) => {
        setSelectedProvider(provider);
        setDetailsModalVisible(true);
    };

    const confirmRejection = async () => {
        if (!rejectReason.trim()) {
            Alert.alert("Reason Required", "Please provide a reason for rejection.");
            return;
        }

        try {
            setVerifying(true);
            const response = await axios.patch(
                `${BASE_URL}/admin/providers/${selectedProvider._id}/verify`,
                {
                    status: "rejected",
                    reason: rejectReason,
                    autoDelete: true
                }
            );

            if (response.data.success) {
                Alert.alert("Success", "Provider rejected and deleted.");
                setModalVisible(false);
                fetchPendingProviders();
            }
        } catch (err) {
            Alert.alert("Error", "Action failed");
        } finally {
            setVerifying(false);
        }
    };

    const deleteProvider = async (userId, name) => {
        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete ${name}? This action is permanent.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await axios.delete(`${BASE_URL}/admin/users/${userId}`);
                            if (response.data.success) {
                                Alert.alert("Deleted", "User has been removed.");
                                fetchPendingProviders();
                            }
                        } catch (err) {
                            Alert.alert("Error", "Delete failed");
                        }
                    }
                }
            ]
        );
    };

    const toggleBlockProvider = async (userId, currentStatus) => {
        try {
            const response = await axios.patch(`${BASE_URL}/admin/users/${userId}/block`, {
                isBlocked: !currentStatus
            });
            if (response.data.success) {
                Alert.alert("Status Updated", `User has been ${!currentStatus ? 'blocked' : 'unblocked'}`);
                fetchPendingProviders();
            }
        } catch (err) {
            Alert.alert("Error", "Update failed");
        }
    };

    const viewDocument = (url) => {
        if (!url) {
            Alert.alert("No Document", "No verification document provided.");
            return;
        }
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
        Linking.openURL(fullUrl).catch(() => Alert.alert("Error", "Cannot open document"));
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarLetter}>{(item.name || "?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                    <TouchableOpacity onPress={() => openDetailsModal(item)}>
                        <Text style={styles.name}>{item.name}</Text>
                    </TouchableOpacity>
                    <Text style={styles.email}>{item.email}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.typeBadge}>
                            <MaterialCommunityIcons name="briefcase-outline" size={11} color={C.secondary} />
                            <Text style={styles.typeText}>{item.providerProfile?.serviceType || "Provider"}</Text>
                        </View>
                        <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => openDetailsModal(item)}>
                            <MaterialCommunityIcons name="information-outline" size={13} color={C.secondary} />
                            <Text style={styles.viewDetailsText}>Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.detailsStrip}>
                <View style={styles.detailChip}>
                    <MaterialCommunityIcons name="phone-outline" size={12} color={C.textLight} />
                    <Text style={styles.detailChipText}>{item.phoneNumber || 'N/A'}</Text>
                </View>
                <View style={styles.detailChip}>
                    <MaterialCommunityIcons name="office-building-outline" size={12} color={C.textLight} />
                    <Text style={styles.detailChipText}>{item.providerProfile?.agencyName || 'Independent'}</Text>
                </View>
            </View>

            <View style={styles.actionGrid}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#D1FAE5", borderColor: C.success }]}
                    onPress={() => approveProvider(item._id)}
                    disabled={verifying}
                >
                    <MaterialCommunityIcons name="check-circle-outline" size={14} color={C.success} />
                    <Text style={[styles.actionBtnText, { color: C.success }]}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#FEF3C7", borderColor: C.warning }]}
                    onPress={() => openRejectModal(item)}
                    disabled={verifying}
                >
                    <MaterialCommunityIcons name="close-circle-outline" size={14} color={C.warning} />
                    <Text style={[styles.actionBtnText, { color: C.warning }]}>Reject</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actionGrid}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: C.bg, borderColor: C.cardBorder }]}
                    onPress={() => toggleBlockProvider(item._id, item.isBlocked)}
                >
                    <MaterialCommunityIcons name={item.isBlocked ? "lock-open-outline" : "lock-outline"} size={14} color={C.textMid} />
                    <Text style={[styles.actionBtnText, { color: C.textMid }]}>{item.isBlocked ? "Unblock" : "Block"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#FEE2E2", borderColor: C.danger }]}
                    onPress={() => deleteProvider(item._id, item.name)}
                >
                    <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.danger} />
                    <Text style={[styles.actionBtnText, { color: C.danger }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />

            {/* Hero Header */}
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.heroCenter}>
                    <Text style={styles.heroTitle}>Pending Approvals</Text>
                    <Text style={styles.heroSub}>{providers.length} pending requests</Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchPendingProviders}>
                    <MaterialCommunityIcons name="refresh" size={22} color="#fff" />
                </TouchableOpacity>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={styles.loadingText}>Fetching pending requests...</Text>
                </View>
            ) : (
                <FlatList
                    data={providers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <MaterialCommunityIcons name="check-circle-outline" size={52} color={C.textLight} />
                            <Text style={styles.emptyText}>No pending approvals</Text>
                            <Text style={styles.emptySubText}>All caught up! 🎉</Text>
                        </View>
                    }
                    refreshing={loading}
                    onRefresh={fetchPendingProviders}
                />
            )}

            {/* Reject Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Reject Provider</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={22} color={C.textMid} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDesc}>Provide a reason. This will also delete the provider's account.</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Reason (e.g., Invalid License)..."
                            placeholderTextColor={C.textLight}
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                        />

                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={[styles.mBtn, styles.mCancel]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.mCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.mBtn, styles.mReject]} onPress={confirmRejection}>
                                <Text style={styles.mRejectText}>Reject & Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Details Modal */}
            <Modal visible={detailsModalVisible} transparent animationType="slide">
                <View style={styles.detailsOverlay}>
                    <View style={styles.detailsContent}>
                        <View style={styles.detailsHeader}>
                            <Text style={styles.detailsTitle}>Provider Details</Text>
                            <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.detailsCloseBtn}>
                                <MaterialCommunityIcons name="close" size={22} color={C.textMid} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsScroll}>
                            {selectedProvider && (
                                <>
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionLabel}>Basic Information</Text>
                                        <DetailRow icon="account" label="Name" value={selectedProvider.name} color={C.secondary} />
                                        <DetailRow icon="email" label="Email" value={selectedProvider.email} color={C.secondary} />
                                        <DetailRow icon="phone" label="Phone" value={selectedProvider.phoneNumber || "N/A"} color={C.secondary} />
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionLabel}>Professional Details</Text>
                                        <DetailRow icon="briefcase-outline" label="Service" value={selectedProvider.providerProfile?.serviceType} color={C.primary} />
                                        <DetailRow icon="office-building" label="Agency" value={selectedProvider.providerProfile?.agencyName || "Independent"} color={C.primary} />
                                        <DetailRow icon="certificate" label="License No." value={selectedProvider.providerProfile?.licenseNumber || "N/A"} color={C.primary} />
                                        {selectedProvider.providerProfile?.serviceType === "caregiver" ? (
                                            <>
                                                <DetailRow icon="medical-bag" label="Caregiving Services" value={selectedProvider.providerProfile?.caregivingServices || "N/A"} color={C.primary} />
                                                <DetailRow icon="account-group-outline" label="Patient Types" value={selectedProvider.providerProfile?.patientTypes || "N/A"} color={C.primary} />
                                                <DetailRow icon="map-marker-multiple-outline" label="Service Locations" value={selectedProvider.providerProfile?.serviceLocations || "N/A"} color={C.primary} />
                                            </>
                                        ) : null}
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionLabel}>Business Information</Text>
                                        <DetailRow icon="map-marker" label="Full Address" value={selectedProvider.providerProfile?.fullAddress || "N/A"} color="#7C3AED" />
                                        <DetailRow icon="calendar-clock" label="Operating Hours" value={selectedProvider.providerProfile?.operatingHours || "N/A"} color="#7C3AED" />
                                        <DetailRow icon="web" label="Website" value={selectedProvider.providerProfile?.website || "N/A"} color="#7C3AED" />
                                        {selectedProvider.providerProfile?.aboutUs && (
                                            <View style={styles.aboutBox}>
                                                <Text style={styles.aboutTitle}>About Us</Text>
                                                <Text style={styles.aboutText}>{selectedProvider.providerProfile.aboutUs}</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionLabel}>Verification Document</Text>
                                        {selectedProvider.providerProfile?.verification?.documentUrl ? (
                                            <View style={styles.docContainer}>
                                                {selectedProvider.providerProfile.verification.documentUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                                                    <Image
                                                        source={{ uri: selectedProvider.providerProfile.verification.documentUrl.startsWith("http") ? selectedProvider.providerProfile.verification.documentUrl : `${BASE_URL}${selectedProvider.providerProfile.verification.documentUrl.startsWith("/") ? "" : "/"}${selectedProvider.providerProfile.verification.documentUrl}` }}
                                                        style={styles.docPreview}
                                                        resizeMode="contain"
                                                    />
                                                ) : (
                                                    <View style={styles.docFileBox}>
                                                        <MaterialCommunityIcons name="file-pdf-box" size={40} color={C.danger} />
                                                        <Text style={styles.docFileName}>PDF Document</Text>
                                                    </View>
                                                )}
                                                <TouchableOpacity
                                                    style={styles.viewDocFullBtn}
                                                    onPress={() => viewDocument(selectedProvider.providerProfile?.verification?.documentUrl)}
                                                >
                                                    <MaterialCommunityIcons name="open-in-new" size={14} color={C.secondary} />
                                                    <Text style={styles.viewDocFullText}>Open Full Document</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <Text style={styles.noDocText}>No document uploaded</Text>
                                        )}
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.detailModalFooter}>
                            <TouchableOpacity
                                style={[styles.footerBtn, { backgroundColor: "#D1FAE5" }]}
                                onPress={() => {
                                    setDetailsModalVisible(false);
                                    approveProvider(selectedProvider._id);
                                }}
                            >
                                <MaterialCommunityIcons name="check-circle" size={18} color={C.success} />
                                <Text style={[styles.footerBtnText, { color: C.success }]}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.footerBtn, { backgroundColor: "#FEE2E2" }]}
                                onPress={() => {
                                    setDetailsModalVisible(false);
                                    openRejectModal(selectedProvider);
                                }}
                            >
                                <MaterialCommunityIcons name="close-circle" size={18} color={C.danger} />
                                <Text style={[styles.footerBtnText, { color: C.danger }]}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Sub-component for Details
const DetailRow = ({ icon, label, value, color }) => (
    <View style={styles.detailsRowItem}>
        <View style={[styles.iconCircle, { backgroundColor: color + "15" }]}>
            <MaterialCommunityIcons name={icon} size={16} color={color} />
        </View>
        <View style={styles.detailsTextCol}>
            <Text style={styles.detailsLabelSmall}>{label}</Text>
            <Text style={styles.detailsValueSmall}>{value || "Not provided"}</Text>
        </View>
    </View>
);

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
    refreshBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center", alignItems: "center",
    },

    listContent: { padding: 16 },

    // Card
    card: {
        backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, shadowColor: C.textDark,
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8,
    },
    cardHeader: { flexDirection: "row", marginBottom: 12 },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: "#E6F3F7", justifyContent: "center", alignItems: "center",
        marginRight: 12,
    },
    avatarLetter: { fontSize: 18, fontWeight: "800", color: C.primary },
    userInfo: { flex: 1 },
    name: { fontSize: 15, fontWeight: "800", color: C.textDark, marginBottom: 2 },
    email: { fontSize: 12, color: C.textLight, fontWeight: "500", marginBottom: 6 },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    typeBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: "#E6F3F7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    typeText: { fontSize: 11, color: C.secondary, fontWeight: "700", textTransform: "capitalize" },
    viewDetailsBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    viewDetailsText: { fontSize: 11, color: C.secondary, fontWeight: "600" },
    detailsStrip: {
        flexDirection: "row", gap: 10, marginBottom: 14,
        paddingTop: 10, borderTopWidth: 1, borderTopColor: C.cardBorder,
    },
    detailChip: { flexDirection: "row", alignItems: "center", gap: 4 },
    detailChipText: { fontSize: 12, color: C.textMid, fontWeight: "500" },

    actionGrid: { flexDirection: "row", gap: 10, marginBottom: 8 },
    actionBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 5, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    },
    actionBtnText: { fontWeight: "700", fontSize: 13 },

    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 10 },
    loadingText: { color: C.textLight, fontWeight: "600", fontSize: 14 },
    emptyText: { fontSize: 16, color: C.textDark, fontWeight: "700", marginTop: 12 },
    emptySubText: { fontSize: 13, color: C.textLight, fontWeight: "500" },

    // Reject Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalContent: {
        backgroundColor: C.surface, borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    modalTitle: { fontSize: 18, fontWeight: "800", color: C.textDark },
    modalDesc: { fontSize: 13, color: C.textMid, marginBottom: 18, lineHeight: 18 },
    input: {
        borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 14,
        minHeight: 80, textAlignVertical: "top", marginBottom: 18,
        backgroundColor: C.bg, fontSize: 14, color: C.textDark,
    },
    modalBtns: { flexDirection: "row", gap: 10 },
    mBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center" },
    mCancel: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder },
    mReject: { backgroundColor: C.danger },
    mCancelText: { color: C.textMid, fontWeight: "700" },
    mRejectText: { color: "#fff", fontWeight: "700" },

    // Details Modal
    detailsOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    detailsContent: {
        backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        height: "90%", paddingTop: 15,
    },
    detailsHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 20, paddingBottom: 15,
        borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    detailsTitle: { fontSize: 18, fontWeight: "800", color: C.textDark },
    detailsCloseBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface,
        justifyContent: "center", alignItems: "center",
    },
    detailsScroll: { padding: 20 },
    detailSection: { marginBottom: 22 },
    detailSectionLabel: {
        fontSize: 12, fontWeight: "700", color: C.textLight,
        textTransform: "uppercase", letterSpacing: 0.8,
        marginBottom: 12, paddingLeft: 5,
        borderLeftWidth: 3, borderLeftColor: C.primary, paddingVertical: 2,
    },
    detailsRowItem: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingLeft: 5 },
    iconCircle: {
        width: 32, height: 32, borderRadius: 12,
        justifyContent: "center", alignItems: "center", marginRight: 12,
    },
    detailsTextCol: { flex: 1 },
    detailsLabelSmall: { fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "600" },
    detailsValueSmall: { fontSize: 14, color: C.textDark, fontWeight: "500" },
    aboutBox: {
        marginTop: 15, backgroundColor: C.surface, padding: 15, borderRadius: 14,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    aboutTitle: { fontSize: 13, fontWeight: "700", color: C.textDark, marginBottom: 5 },
    aboutText: { fontSize: 13, color: C.textMid, lineHeight: 18 },
    docContainer: { marginTop: 10, alignItems: "center" },
    docPreview: { width: "100%", height: 250, borderRadius: 14, backgroundColor: C.bg },
    docFileBox: {
        width: "100%", padding: 40, backgroundColor: "#FFF5F5", borderRadius: 14,
        alignItems: "center", borderWidth: 1, borderColor: "#FECACA", borderStyle: "dashed",
    },
    docFileName: { marginTop: 10, color: C.danger, fontWeight: "700" },
    viewDocFullBtn: {
        marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6,
        paddingVertical: 10, paddingHorizontal: 18,
        backgroundColor: "#E6F3F7", borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder,
    },
    viewDocFullText: { color: C.secondary, fontWeight: "700", fontSize: 13 },
    noDocText: { color: C.textLight, fontStyle: "italic" },
    detailModalFooter: {
        flexDirection: "row", padding: 20,
        paddingBottom: Platform.OS === "ios" ? 40 : 20,
        borderTopWidth: 1, borderTopColor: C.cardBorder, gap: 12,
    },
    footerBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 14, borderRadius: 14,
    },
    footerBtnText: { fontWeight: "700", fontSize: 15 },
});
