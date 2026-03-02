import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    RefreshControl,
    Modal,
    ScrollView,
    StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";

const BASE_URL =
    Platform.OS === "web"
        ? "http://localhost:5000"
        : "http://172.16.230.150:5000";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
    bg: "#F0F6F9", surface: "#FFFFFF",
    textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8",
    cardBorder: "#DBE8EE", success: "#10B981", danger: "#EF4444", warning: "#F59E0B",
};

const STATUS_CONFIG = {
    pending: { color: "#F59E0B", bg: "#FEF3C7", icon: "clock-outline", label: "Pending" },
    confirmed: { color: "#1D8FAB", bg: "#E0F2F7", icon: "check-circle-outline", label: "Confirmed" },
    "in-progress": { color: "#7C3AED", bg: "#F3EEFF", icon: "progress-clock", label: "In Progress" },
    completed: { color: "#10B981", bg: "#D1FAE5", icon: "check-all", label: "Completed" },
    cancelled: { color: "#EF4444", bg: "#FEE2E2", icon: "close-circle-outline", label: "Cancelled" },
};

const PAYMENT_CONFIG = {
    pending: { color: "#F59E0B", label: "Payment Pending" },
    paid: { color: "#10B981", label: "Paid" },
    refunded: { color: "#EF4444", label: "Refunded" },
};

export default function AdminBookingsScreen({ navigation }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState("all");
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchBookings = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await axios.get(`${BASE_URL}/admin/bookings`);
            if (response.data.success) {
                setBookings(response.data.bookings || []);
            }
        } catch (err) {
            console.error("Failed to fetch bookings:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [])
    );

    const filteredBookings =
        filter === "all"
            ? bookings
            : bookings.filter((b) => b.status === filter);

    const formatDate = (d) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return "—";
        return `₹${amount.toLocaleString("en-IN")}`;
    };

    const filters = [
        { key: "all", label: "All" },
        { key: "pending", label: "Pending" },
        { key: "confirmed", label: "Confirmed" },
        { key: "in-progress", label: "Active" },
        { key: "completed", label: "Done" },
        { key: "cancelled", label: "Cancelled" },
    ];

    const renderBooking = ({ item }) => {
        const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
        const paymentConf = PAYMENT_CONFIG[item.paymentStatus] || PAYMENT_CONFIG.pending;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => { setSelectedBooking(item); setModalVisible(true); }}
            >
                {/* Header row */}
                <View style={styles.cardHeader}>
                    <View style={styles.equipmentRow}>
                        <View style={styles.equipIconWrap}>
                            <MaterialCommunityIcons name="medical-bag" size={16} color={C.primary} />
                        </View>
                        <Text style={styles.equipmentName} numberOfLines={1}>
                            {item.equipmentName || item.equipmentId?.equipmentName || "Equipment"}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
                        <MaterialCommunityIcons name={statusConf.icon} size={12} color={statusConf.color} />
                        <Text style={[styles.statusText, { color: statusConf.color }]}>
                            {statusConf.label}
                        </Text>
                    </View>
                </View>

                {/* People */}
                <View style={styles.peopleSection}>
                    <View style={styles.personRow}>
                        <MaterialCommunityIcons name="account-heart" size={14} color={C.textLight} />
                        <Text style={styles.personLabel}>Patient:</Text>
                        <Text style={styles.personName}>
                            {item.patientName || item.patientId?.name || "—"}
                        </Text>
                    </View>
                    <View style={styles.personRow}>
                        <MaterialCommunityIcons name="stethoscope" size={14} color={C.textLight} />
                        <Text style={styles.personLabel}>Provider:</Text>
                        <Text style={styles.personName}>
                            {item.providerName || item.providerId?.name || "—"}
                        </Text>
                    </View>
                </View>

                {/* Details grid */}
                <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Dates</Text>
                        <Text style={styles.detailValue}>
                            {formatDate(item.startDate)} — {formatDate(item.endDate)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Days</Text>
                            <Text style={styles.detailValue}>{item.totalDays || "—"}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Qty</Text>
                            <Text style={styles.detailValue}>{item.quantity || 1}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Total</Text>
                            <Text style={[styles.detailValue, { fontWeight: "700", color: C.primary }]}>
                                {formatCurrency(item.totalAmount)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                    <View style={[styles.paymentBadge, { borderColor: paymentConf.color + "40" }]}>
                        <Text style={[styles.paymentText, { color: paymentConf.color }]}>
                            {paymentConf.label}
                        </Text>
                    </View>
                    <Text style={styles.dateCreated}>
                        {formatDate(item.createdAt)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerFull}>
                <StatusBar barStyle="light-content" backgroundColor={C.primary} />
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading bookings...</Text>
            </View>
        );
    }

    const DetailRow = ({ icon, label, value }) => (
        <View style={styles.modalDetailRow}>
            <MaterialCommunityIcons name={icon} size={16} color={C.textLight} />
            <Text style={styles.modalDetailLabel}>{label}</Text>
            <Text style={styles.modalDetailValue}>{value || "—"}</Text>
        </View>
    );

    const renderDetailModal = () => {
        if (!selectedBooking) return null;
        const b = selectedBooking;
        const statusConf = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
        const paymentConf = PAYMENT_CONFIG[b.paymentStatus] || PAYMENT_CONFIG.pending;

        return (
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Booking Details</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                                <MaterialCommunityIcons name="close" size={22} color={C.textMid} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* Equipment & Status */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Equipment</Text>
                                <View style={styles.modalCard}>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <Text style={styles.modalEquipName}>
                                            {b.equipmentName || b.equipmentId?.equipmentName || "Equipment"}
                                        </Text>
                                        <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
                                            <MaterialCommunityIcons name={statusConf.icon} size={13} color={statusConf.color} />
                                            <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* People */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>People</Text>
                                <View style={styles.modalCard}>
                                    <DetailRow icon="account-heart" label="Patient" value={b.patientName || b.patientId?.name} />
                                    <DetailRow icon="email-outline" label="Patient Email" value={b.patientId?.email} />
                                    <DetailRow icon="stethoscope" label="Provider" value={b.providerName || b.providerId?.name} />
                                </View>
                            </View>

                            {/* Rental Period */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Rental Period</Text>
                                <View style={styles.modalCard}>
                                    <DetailRow icon="calendar-start" label="Start Date" value={formatDate(b.startDate)} />
                                    <DetailRow icon="calendar-end" label="End Date" value={formatDate(b.endDate)} />
                                    <DetailRow icon="calendar-range" label="Total Days" value={`${b.totalDays || 0} days`} />
                                </View>
                            </View>

                            {/* Pricing */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Pricing</Text>
                                <View style={styles.modalCard}>
                                    <DetailRow icon="currency-inr" label="Price/Day" value={formatCurrency(b.pricePerDay)} />
                                    <DetailRow icon="counter" label="Quantity" value={`${b.quantity || 1}`} />
                                    <DetailRow icon="cash-multiple" label="Total Amount" value={formatCurrency(b.totalAmount)} />
                                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
                                        <MaterialCommunityIcons name="credit-card-outline" size={16} color={paymentConf.color} />
                                        <Text style={[styles.modalDetailLabel, { color: paymentConf.color, fontWeight: "700" }]}>{paymentConf.label}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Delivery */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Delivery</Text>
                                <View style={styles.modalCard}>
                                    <DetailRow icon="map-marker" label="Address" value={b.deliveryAddress} />
                                    <DetailRow icon="phone" label="Contact" value={b.contactPhone} />
                                </View>
                            </View>

                            {/* Notes */}
                            {b.notes ? (
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Notes</Text>
                                    <View style={styles.modalCard}>
                                        <Text style={styles.modalNotes}>{b.notes}</Text>
                                    </View>
                                </View>
                            ) : null}

                            {/* Cancellation */}
                            {b.status === "cancelled" && (
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Cancellation</Text>
                                    <View style={[styles.modalCard, { borderLeftWidth: 3, borderLeftColor: C.danger }]}>
                                        <DetailRow icon="account-cancel" label="Cancelled By" value={b.cancelledBy || "—"} />
                                        <DetailRow icon="text-box-outline" label="Reason" value={b.cancellationReason || "No reason"} />
                                    </View>
                                </View>
                            )}

                            {/* Review */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Review</Text>
                                <View style={styles.modalCard}>
                                    {b.hasReview && b.review ? (
                                        <>
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                <Text style={{ color: "#FFC107", fontSize: 18, fontWeight: "700" }}>
                                                    {"★".repeat(b.review.rating || 0)}{"☆".repeat(5 - (b.review.rating || 0))}
                                                </Text>
                                                <Text style={{ fontSize: 16, fontWeight: "700", color: C.textDark }}>
                                                    {b.review.rating}/5
                                                </Text>
                                            </View>
                                            {b.review.comment ? (
                                                <Text style={{ fontSize: 13, color: C.textMid, fontStyle: "italic", marginBottom: 6 }}>
                                                    "{b.review.comment}"
                                                </Text>
                                            ) : null}
                                            {b.review.reviewDate ? (
                                                <Text style={{ fontSize: 11, color: C.textLight }}>
                                                    Reviewed on {formatDate(b.review.reviewDate)}
                                                </Text>
                                            ) : null}
                                        </>
                                    ) : (
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                            <MaterialCommunityIcons name="star-off-outline" size={18} color={C.textLight} />
                                            <Text style={{ fontSize: 13, color: C.textLight }}>No review yet</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Timestamps */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Timestamps</Text>
                                <View style={styles.modalCard}>
                                    <DetailRow icon="clock-plus-outline" label="Created" value={formatDate(b.createdAt)} />
                                    <DetailRow icon="clock-edit-outline" label="Updated" value={formatDate(b.updatedAt)} />
                                </View>
                            </View>

                            {/* Booking ID */}
                            <View style={{ alignItems: "center", marginTop: 8 }}>
                                <Text style={{ fontSize: 10, color: C.textLight }}>Booking ID: {b._id}</Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            {renderDetailModal()}

            {/* Hero Header */}
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.heroCenter}>
                    <Text style={styles.heroTitle}>All Bookings</Text>
                    <Text style={styles.heroSub}>{bookings.length} total bookings</Text>
                </View>
                <View style={{ width: 36 }} />
            </LinearGradient>

            {/* Filters */}
            <View style={styles.filterRow}>
                {filters.map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[
                            styles.filterChip,
                            filter === f.key && styles.filterChipActive,
                        ]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filter === f.key && styles.filterTextActive,
                            ]}
                        >
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Bookings list */}
            <FlatList
                data={filteredBookings}
                keyExtractor={(item) => item._id}
                renderItem={renderBooking}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchBookings(true)}
                        tintColor={C.primary}
                        colors={[C.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="package-variant" size={48} color={C.textLight} />
                        <Text style={styles.emptyTitle}>No bookings found</Text>
                        <Text style={styles.emptySubtitle}>
                            {filter !== "all"
                                ? `No ${filter} bookings`
                                : "Bookings will appear here"}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    centerFull: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
    loadingText: { marginTop: 10, color: C.textLight, fontWeight: "600" },

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

    // Filters
    filterRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 12, gap: 6 },
    filterChip: {
        flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: "center",
        backgroundColor: C.surface, borderWidth: 1, borderColor: C.cardBorder,
    },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterText: { fontSize: 12, fontWeight: "700", color: C.textLight, letterSpacing: 0.1 },
    filterTextActive: { color: "#fff" },

    // Card
    card: {
        backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, shadowColor: C.textDark,
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8,
    },
    cardHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
    },
    equipmentRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 8 },
    equipIconWrap: {
        width: 30, height: 30, borderRadius: 10, backgroundColor: "#E6F3F7",
        justifyContent: "center", alignItems: "center",
    },
    equipmentName: { fontSize: 15, fontWeight: "700", color: C.textDark, flex: 1 },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },

    // People
    peopleSection: { gap: 6, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    personRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    personLabel: { fontSize: 11, color: C.textLight, width: 55, fontWeight: "600" },
    personName: { fontSize: 13, fontWeight: "600", color: C.textDark },

    // Details
    detailsGrid: { gap: 8, marginBottom: 12 },
    detailRow: { flexDirection: "row", gap: 16 },
    detailItem: {},
    detailLabel: { fontSize: 10, fontWeight: "600", color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    detailValue: { fontSize: 13, fontWeight: "500", color: C.textDark },

    // Footer
    cardFooter: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingTop: 10, borderTopWidth: 1, borderTopColor: C.cardBorder,
    },
    paymentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    paymentText: { fontSize: 11, fontWeight: "600" },
    dateCreated: { fontSize: 11, color: C.textLight },

    // Empty
    emptyState: { alignItems: "center", paddingTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: C.textDark, marginTop: 12 },
    emptySubtitle: { fontSize: 13, color: C.textLight, marginTop: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContainer: {
        backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: "90%", paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        padding: 20, borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    modalCloseBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg,
        justifyContent: "center", alignItems: "center",
    },
    modalTitle: { fontSize: 18, fontWeight: "800", color: C.textDark },
    modalSection: { paddingHorizontal: 20, marginTop: 16 },
    modalSectionTitle: {
        fontSize: 12, fontWeight: "700", color: C.textLight,
        textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8,
    },
    modalCard: {
        backgroundColor: C.surface, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    modalEquipName: { fontSize: 17, fontWeight: "700", color: C.textDark, flex: 1, marginRight: 10 },
    modalDetailRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
    modalDetailLabel: { fontSize: 13, color: C.textMid, width: 100 },
    modalDetailValue: { fontSize: 13, fontWeight: "600", color: C.textDark, flex: 1 },
    modalNotes: { fontSize: 13, color: C.textDark, lineHeight: 20 },
});
