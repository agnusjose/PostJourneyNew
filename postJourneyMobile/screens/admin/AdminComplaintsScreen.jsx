import React, { useState, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl, Modal, Platform, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const BASE_URL = "http://10.63.72.99:5000";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
    bg: "#F0F6F9", surface: "#FFFFFF",
    textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8",
    cardBorder: "#DBE8EE", success: "#10B981", danger: "#EF4444", warning: "#F59E0B",
};

const FILTERS = ["all", "pending", "reviewed", "resolved", "dismissed"];

const STATUS_META = {
    pending: { label: "Pending", color: C.warning, bg: "#FEF3C7" },
    reviewed: { label: "Reviewed", color: C.secondary, bg: "#E0F2F7" },
    resolved: { label: "Resolved", color: C.success, bg: "#D1FAE5" },
    dismissed: { label: "Dismissed", color: C.textLight, bg: C.bg },
};

const USER_TYPE_COLOR = {
    patient: C.secondary,
    doctor: "#7C3AED",
    "service-provider": C.success,
};

export default function AdminComplaintsScreen({ navigation }) {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [replyStatus, setReplyStatus] = useState("reviewed");
    const [savingReply, setSavingReply] = useState(false);

    const fetchComplaints = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/admin/complaints?status=${filter}`);
            if (res.data.success) setComplaints(res.data.complaints);
        } catch (e) {
            console.error("Admin fetch complaints error:", e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchComplaints(); }, [filter]));

    const openDetail = (item) => {
        setSelected(item);
        setReplyText(item.adminReply || "");
        setReplyStatus(item.status === "pending" ? "reviewed" : item.status);
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) {
            Alert.alert("Validation", "Reply cannot be empty.");
            return;
        }
        setSavingReply(true);
        try {
            const res = await axios.patch(`${BASE_URL}/api/admin/complaints/${selected._id}/reply`, {
                reply: replyText.trim(),
                status: replyStatus,
            });
            if (res.data.success) {
                Alert.alert("✅ Reply Sent", "Your reply has been saved.");
                setSelected(null);
                fetchComplaints();
            } else {
                Alert.alert("Error", res.data.error || "Failed to send reply.");
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.error || "Could not save reply.");
        } finally {
            setSavingReply(false);
        }
    };

    const handleStatusChange = async (complaintId, newStatus) => {
        try {
            await axios.patch(`${BASE_URL}/api/admin/complaints/${complaintId}/status`, { status: newStatus });
            fetchComplaints();
        } catch (e) {
            Alert.alert("Error", "Failed to update status.");
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />

            {/* Hero Header */}
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.heroCenter}>
                    <Text style={styles.heroTitle}>User Complaints</Text>
                    <Text style={styles.heroSub}>{complaints.length} complaints</Text>
                </View>
                <View style={styles.heroIcon}>
                    <MaterialCommunityIcons name="flag-outline" size={22} color="#fff" />
                </View>
            </LinearGradient>

            {/* Filter tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchComplaints(true)} colors={[C.primary]} tintColor={C.primary} />}
            >
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={C.primary} />
                        <Text style={styles.loadingText}>Loading complaints...</Text>
                    </View>
                ) : complaints.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="clipboard-check-outline" size={52} color={C.textLight} />
                        <Text style={styles.emptyTitle}>No Complaints</Text>
                        <Text style={styles.emptySubtitle}>
                            {filter === "all" ? "No complaints received yet." : `No ${filter} complaints.`}
                        </Text>
                    </View>
                ) : (
                    complaints.map(item => {
                        const meta = STATUS_META[item.status] || STATUS_META.pending;
                        const userColor = USER_TYPE_COLOR[item.userType] || C.textMid;
                        return (
                            <TouchableOpacity
                                key={item._id}
                                style={styles.card}
                                onPress={() => openDetail(item)}
                                activeOpacity={0.75}
                            >
                                <View style={styles.cardTop}>
                                    <View style={[styles.userTypeDot, { backgroundColor: userColor + "18" }]}>
                                        <MaterialCommunityIcons
                                            name={item.userType === "doctor" ? "doctor" : item.userType === "patient" ? "account-heart" : "storefront-outline"}
                                            size={16} color={userColor}
                                        />
                                    </View>
                                    <View style={styles.cardTopInfo}>
                                        <Text style={styles.cardUserName}>{item.userName}</Text>
                                        <Text style={[styles.cardUserType, { color: userColor }]}>
                                            {item.userType}
                                        </Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                                        <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                                    </View>
                                </View>

                                <Text style={styles.cardSubject}>{item.subject}</Text>
                                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

                                <View style={styles.cardFooter}>
                                    <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                                    {item.adminReply
                                        ? <View style={styles.repliedBadge}>
                                            <MaterialCommunityIcons name="check-circle" size={12} color={C.success} />
                                            <Text style={styles.replied}>Replied</Text>
                                        </View>
                                        : <View style={styles.awaitingBadge}>
                                            <MaterialCommunityIcons name="clock-outline" size={12} color={C.warning} />
                                            <Text style={styles.notReplied}>Awaiting</Text>
                                        </View>
                                    }
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>

            {/* Detail + Reply Modal */}
            <Modal
                visible={!!selected}
                transparent
                animationType="slide"
                onRequestClose={() => setSelected(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selected && (() => {
                                const meta = STATUS_META[selected.status] || STATUS_META.pending;
                                return (
                                    <>
                                        <View style={styles.modalHeader}>
                                            <Text style={styles.modalTitle}>{selected.subject}</Text>
                                            <TouchableOpacity onPress={() => setSelected(null)} style={styles.modalCloseBtn}>
                                                <MaterialCommunityIcons name="close" size={20} color={C.textMid} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                                                <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.modalMeta}>
                                            From: <Text style={{ fontWeight: "700", color: C.textDark }}>{selected.userName}</Text>  ·  {selected.userType}  ·  {formatDate(selected.createdAt)}
                                        </Text>

                                        <Text style={styles.sLabel}>Description</Text>
                                        <View style={styles.descBox}>
                                            <Text style={styles.modalBody}>{selected.description}</Text>
                                        </View>

                                        {/* Status quick-change */}
                                        <Text style={styles.sLabel}>Change Status</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                            {["pending", "reviewed", "resolved", "dismissed"].map(s => {
                                                const m = STATUS_META[s];
                                                return (
                                                    <TouchableOpacity
                                                        key={s}
                                                        style={[styles.statusChip, {
                                                            backgroundColor: replyStatus === s ? m.bg : C.bg,
                                                            borderColor: replyStatus === s ? m.color : C.cardBorder,
                                                            borderWidth: 1.5,
                                                        }]}
                                                        onPress={() => setReplyStatus(s)}
                                                    >
                                                        <Text style={[styles.statusChipText, { color: replyStatus === s ? m.color : C.textMid }]}>{m.label}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>

                                        <Text style={styles.sLabel}>Your Reply</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Type your reply to the user..."
                                            placeholderTextColor={C.textLight}
                                            value={replyText}
                                            onChangeText={setReplyText}
                                            multiline
                                            numberOfLines={4}
                                        />
                                    </>
                                );
                            })()}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtnModal} onPress={() => setSelected(null)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sendBtn, savingReply && styles.disabledBtn]}
                                onPress={handleSendReply}
                                disabled={savingReply}
                            >
                                {savingReply
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <>
                                        <MaterialCommunityIcons name="send" size={16} color="#fff" />
                                        <Text style={styles.sendBtnText}>Send Reply</Text>
                                    </>
                                }
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
    heroIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center", alignItems: "center",
    },

    // Filter
    filterRow: { backgroundColor: C.surface, maxHeight: 54, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    filterContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
    filterTab: {
        paddingHorizontal: 16, paddingVertical: 7, borderRadius: 12,
        backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder,
    },
    filterTabActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterTabText: { fontSize: 12, fontWeight: "700", color: C.textMid },
    filterTabTextActive: { color: "#fff" },

    scroll: { padding: 16, paddingBottom: 40 },
    center: { alignItems: "center", paddingTop: 60, gap: 12 },
    loadingText: { color: C.textLight, fontWeight: "600" },

    // Card
    card: {
        backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, shadowColor: C.textDark,
        shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    },
    cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    userTypeDot: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 10 },
    cardTopInfo: { flex: 1 },
    cardUserName: { fontSize: 14, fontWeight: "700", color: C.textDark },
    cardUserType: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    cardSubject: { fontSize: 15, fontWeight: "700", color: C.textDark, marginBottom: 4 },
    cardDesc: { fontSize: 13, color: C.textMid, lineHeight: 18, marginBottom: 10 },
    cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardDate: { fontSize: 11, color: C.textLight },
    repliedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    replied: { fontSize: 11, color: C.success, fontWeight: "700" },
    awaitingBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    notReplied: { fontSize: 11, color: C.warning, fontWeight: "700" },

    emptyState: { alignItems: "center", paddingTop: 80, gap: 6 },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: C.textDark },
    emptySubtitle: { fontSize: 13, color: C.textLight },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalBox: {
        backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, maxHeight: "90%",
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
    modalTitle: { fontSize: 17, fontWeight: "800", color: C.textDark, flex: 1, marginRight: 10 },
    modalCloseBtn: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg,
        justifyContent: "center", alignItems: "center",
    },
    modalMeta: { fontSize: 12, color: C.textLight, marginBottom: 18, lineHeight: 16 },
    sLabel: { fontSize: 11, fontWeight: "700", color: C.textLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
    descBox: {
        backgroundColor: C.bg, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: C.cardBorder, marginBottom: 18,
    },
    modalBody: { fontSize: 14, color: C.textDark, lineHeight: 22 },

    statusChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, marginRight: 8 },
    statusChipText: { fontSize: 12, fontWeight: "700" },

    input: {
        backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark,
        minHeight: 100, textAlignVertical: "top",
    },

    modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },
    cancelBtnModal: {
        flex: 1, backgroundColor: C.bg, borderRadius: 14, paddingVertical: 13,
        alignItems: "center", borderWidth: 1, borderColor: C.cardBorder,
    },
    cancelBtnText: { fontSize: 14, fontWeight: "700", color: C.textMid },
    sendBtn: {
        flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 13,
    },
    disabledBtn: { opacity: 0.6 },
    sendBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
