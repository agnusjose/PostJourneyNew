import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl, Modal, Platform,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const BASE_URL = "http://10.63.72.99:5000";

const STATUS_META = {
    pending: { label: "Pending", color: "#f59e0b", bg: "#fffbeb" },
    reviewed: { label: "Reviewed", color: "#3b82f6", bg: "#eff6ff" },
    resolved: { label: "Resolved", color: "#10b981", bg: "#ecfdf5" },
    dismissed: { label: "Dismissed", color: "#94a3b8", bg: "#f8fafc" },
};

export default function ComplaintsScreen({ route, navigation }) {
    const { userId, userName, userType } = route.params || {};

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [showForm, setShowForm] = useState(false);

    // Detail modal
    const [selected, setSelected] = useState(null);

    const fetchComplaints = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await axios.get(`${BASE_URL}/api/complaints/user/${userId}`);
            if (res.data.success) setComplaints(res.data.complaints);
        } catch (e) {
            console.error("Fetch complaints error:", e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchComplaints(); }, []));

    const handleSubmit = async () => {
        if (!subject.trim() || subject.trim().length < 5) {
            Alert.alert("Validation", "Subject must be at least 5 characters.");
            return;
        }
        if (!description.trim() || description.trim().length < 20) {
            Alert.alert("Validation", "Description must be at least 20 characters.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/complaints`, {
                userId, userName, userType, subject: subject.trim(), description: description.trim(),
            });
            if (res.data.success) {
                Alert.alert("✅ Submitted", "Your complaint has been submitted. Admin will review it shortly.");
                setSubject("");
                setDescription("");
                setShowForm(false);
                fetchComplaints();
            } else {
                Alert.alert("Error", res.data.error || "Failed to submit.");
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.error || "Could not submit complaint. Check your connection.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    };

    const renderComplaintCard = (item) => {
        const meta = STATUS_META[item.status] || STATUS_META.pending;
        return (
            <TouchableOpacity
                key={item._id}
                style={styles.card}
                onPress={() => setSelected(item)}
                activeOpacity={0.75}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardSubject} numberOfLines={1}>{item.subject}</Text>
                    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                    {item.adminReply ? (
                        <View style={styles.replyBadge}>
                            <MaterialCommunityIcons name="reply" size={12} color="#10b981" />
                            <Text style={styles.replyBadgeText}>Admin replied</Text>
                        </View>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#0A5F7A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Complaints</Text>
                <TouchableOpacity
                    style={styles.newBtn}
                    onPress={() => setShowForm(v => !v)}
                >
                    <MaterialCommunityIcons name={showForm ? "close" : "plus"} size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchComplaints(true)} colors={["#0A5F7A"]} />}
            >
                {/* New complaint form */}
                {showForm && (
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>📝 New Complaint</Text>

                        <Text style={styles.label}>Subject *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Brief summary of your issue"
                            placeholderTextColor="#94a3b8"
                            value={subject}
                            onChangeText={setSubject}
                            maxLength={100}
                        />

                        <Text style={styles.label}>Description * <Text style={styles.hint}>(min 20 chars)</Text></Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe your issue in detail..."
                            placeholderTextColor="#94a3b8"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.disabledBtn]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={styles.submitBtnText}>Submit Complaint</Text>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* Complaints list */}
                {loading ? (
                    <ActivityIndicator size="large" color="#0A5F7A" style={{ marginTop: 60 }} />
                ) : complaints.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No Complaints Yet</Text>
                        <Text style={styles.emptySubtitle}>Tap + to register a new complaint.</Text>
                    </View>
                ) : (
                    complaints.map(renderComplaintCard)
                )}
            </ScrollView>

            {/* Detail modal */}
            <Modal
                visible={!!selected}
                transparent
                animationType="slide"
                onRequestClose={() => setSelected(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <ScrollView>
                            {selected && (() => {
                                const meta = STATUS_META[selected.status] || STATUS_META.pending;
                                return (
                                    <>
                                        <View style={styles.modalHeader}>
                                            <Text style={styles.modalTitle}>{selected.subject}</Text>
                                            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                                                <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.modalDate}>Submitted on {formatDate(selected.createdAt)}</Text>

                                        <Text style={styles.sectionLabel}>Your Description</Text>
                                        <Text style={styles.modalBody}>{selected.description}</Text>

                                        {selected.adminReply ? (
                                            <>
                                                <Text style={styles.sectionLabel}>Admin Reply</Text>
                                                <View style={styles.replyBox}>
                                                    <MaterialCommunityIcons name="shield-account" size={18} color="#0A5F7A" style={{ marginRight: 8 }} />
                                                    <Text style={styles.replyText}>{selected.adminReply}</Text>
                                                </View>
                                                {selected.repliedAt && (
                                                    <Text style={styles.replyDate}>Replied on {formatDate(selected.repliedAt)}</Text>
                                                )}
                                            </>
                                        ) : (
                                            <View style={styles.noReplyBox}>
                                                <MaterialCommunityIcons name="clock-outline" size={18} color="#94a3b8" />
                                                <Text style={styles.noReplyText}>Awaiting admin response...</Text>
                                            </View>
                                        )}
                                    </>
                                );
                            })()}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F0F6F9" },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingTop: Platform.OS === "ios" ? 56 : 44, paddingBottom: 16,
        paddingHorizontal: 20, backgroundColor: "#fff",
        elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: "#0A5F7A", flex: 1, marginLeft: 14 },
    newBtn: {
        backgroundColor: "#0A5F7A", width: 36, height: 36, borderRadius: 18,
        justifyContent: "center", alignItems: "center",
    },
    scroll: { padding: 16, paddingBottom: 40 },

    // Form
    formCard: {
        backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 16,
        elevation: 3, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    },
    formTitle: { fontSize: 16, fontWeight: "700", color: "#0A5F7A", marginBottom: 14 },
    label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6 },
    hint: { fontWeight: "400", color: "#94a3b8" },
    input: {
        backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: "#1e293b", marginBottom: 14,
    },
    textArea: { minHeight: 110, textAlignVertical: "top" },
    submitBtn: {
        backgroundColor: "#0A5F7A", borderRadius: 12, paddingVertical: 13,
        alignItems: "center", marginTop: 4,
    },
    disabledBtn: { opacity: 0.6 },
    submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    // Cards
    card: {
        backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
        elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    cardSubject: { fontSize: 15, fontWeight: "700", color: "#1e293b", flex: 1, marginRight: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    cardDesc: { fontSize: 13, color: "#64748b", lineHeight: 18, marginBottom: 10 },
    cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardDate: { fontSize: 11, color: "#94a3b8" },
    replyBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
    replyBadgeText: { fontSize: 11, color: "#10b981", fontWeight: "600" },

    // Empty
    emptyState: { alignItems: "center", paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: "#475569", marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: "#94a3b8", marginTop: 6 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalBox: {
        backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, maxHeight: "80%",
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
    modalTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b", flex: 1, marginRight: 10 },
    modalDate: { fontSize: 12, color: "#94a3b8", marginBottom: 18 },
    sectionLabel: { fontSize: 12, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
    modalBody: { fontSize: 15, color: "#334155", lineHeight: 22, marginBottom: 20 },
    replyBox: {
        flexDirection: "row", backgroundColor: "#ecfdf5", borderRadius: 12,
        padding: 14, marginBottom: 8,
    },
    replyText: { fontSize: 14, color: "#1e293b", lineHeight: 20, flex: 1 },
    replyDate: { fontSize: 11, color: "#94a3b8", marginBottom: 16 },
    noReplyBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#f8fafc", borderRadius: 10, padding: 12, marginBottom: 16,
    },
    noReplyText: { fontSize: 13, color: "#94a3b8" },
    closeBtn: {
        backgroundColor: "#f1f5f9", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 10,
    },
    closeBtnText: { fontSize: 15, fontWeight: "700", color: "#475569" },
});
