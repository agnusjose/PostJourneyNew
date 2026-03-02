import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

const C = {
    primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
    cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
    textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
    warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B', lightTeal: '#E0F2F7',
};

export default function ProviderBookingDetailsScreen({ navigation, route }) {
    const { booking: initialBooking } = route.params;
    const [booking, setBooking] = useState(initialBooking);
    const [loading, setLoading] = useState(false);
    const BASE_URL = "http://172.16.230.150:5000";

    const getStatusColor = (status) => { switch (status) { case "confirmed": return C.success; case "in-progress": return C.secondary; case "completed": return C.success; case "cancelled": return C.danger; default: return C.warning; } };
    const getPaymentStatusColor = (status) => { switch (status) { case "paid": return C.success; case "pending": return C.warning; case "refunded": return '#8b5cf6'; default: return C.textMuted; } };

    const updateBookingStatus = async (status) => {
        setLoading(true);
        try {
            const res = await axios.put(`${BASE_URL}/booking/update-status/${booking._id}`, { status });
            if (res.data.success) { setBooking({ ...booking, status }); Alert.alert("Success", `Booking ${status} successfully`); }
        } catch (error) { Alert.alert("Error", "Failed to update status"); } finally { setLoading(false); }
    };

    const updatePaymentStatus = async () => {
        Alert.alert("Confirm Payment", "Have you received the cash payment for this order?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Yes, Mark as Paid", onPress: async () => {
                    setLoading(true);
                    try {
                        const res = await axios.put(`${BASE_URL}/booking/update-payment-status/${booking._id}`, { paymentStatus: "paid" });
                        if (res.data.success) { setBooking({ ...booking, paymentStatus: "paid" }); Alert.alert("Success", "Payment marked as paid"); }
                    } catch (error) { Alert.alert("Error", "Failed to update payment status"); } finally { setLoading(false); }
                }
            }
        ]);
    };

    const renderStars = (rating) => { const stars = []; for (let i = 1; i <= 5; i++) { stars.push(<Ionicons key={i} name={i <= rating ? "star" : "star-outline"} size={16} color="#fbbf24" style={{ marginRight: 2 }} />); } return stars; };

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
                <View style={s.hdr}>
                    <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                    <Text style={s.hdrT}>Booking Details</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            {loading && (<View style={s.loadingOverlay}><ActivityIndicator size="large" color={C.secondary} /></View>)}

            <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Order Header */}
                <View style={s.orderHeader}>
                    <View><Text style={s.orderId}>Order #{booking._id?.slice(-8).toUpperCase()}</Text><Text style={s.orderDate}>{new Date(booking.createdAt || booking.startDate).toLocaleDateString()}</Text></View>
                    <View style={[s.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}><Text style={s.statusText}>{booking.status?.toUpperCase()}</Text></View>
                </View>

                {/* Payment Info */}
                <View style={s.section}><Text style={s.sectionTitle}>Payment</Text>
                    <View style={s.card}>
                        <View style={s.payRow}><Text style={s.payLabel}>Method</Text>
                            <View style={s.payMethodBadge}><Ionicons name={booking.paymentMethod === "cod" ? "cash-outline" : "card-outline"} size={16} color={C.success} />
                                <Text style={s.payMethodText}>{booking.paymentMethod === "cod" ? "Cash on Delivery" : booking.paymentMethod?.toUpperCase() || "Pending"}</Text></View></View>
                        <View style={[s.payRow, { marginTop: 12 }]}><Text style={s.payLabel}>Status</Text>
                            <View style={[s.payStatusBadge, { backgroundColor: getPaymentStatusColor(booking.paymentStatus) }]}>
                                <Text style={s.payStatusText}>{booking.paymentStatus?.toUpperCase() || "PENDING"}</Text></View></View>
                    </View></View>

                {/* Customer Info */}
                <View style={s.section}><Text style={s.sectionTitle}>Customer Details</Text>
                    <View style={s.card}>
                        <View style={s.infoRow}><Ionicons name="person-outline" size={20} color={C.textSecondary} /><Text style={s.infoValue}>{booking.patientName || "N/A"}</Text></View>
                        <View style={s.infoRow}><Ionicons name="call-outline" size={20} color={C.textSecondary} /><Text style={s.infoValue}>{booking.contactPhone || "N/A"}</Text></View>
                        <View style={[s.infoRow, { alignItems: 'flex-start' }]}><Ionicons name="location-outline" size={20} color={C.textSecondary} style={{ marginTop: 2 }} /><Text style={s.infoValue}>{booking.deliveryAddress || "N/A"}</Text></View>
                    </View></View>

                {/* Equipment */}
                <View style={s.section}><Text style={s.sectionTitle}>Equipment</Text>
                    <View style={s.card}>
                        <View style={s.eqRow}><View style={s.iconC}><Ionicons name="medkit-outline" size={24} color={C.secondary} /></View>
                            <View style={{ flex: 1 }}><Text style={s.eqName}>{booking.equipmentName}</Text><Text style={s.qty}>Quantity: {booking.quantity || 1}</Text></View></View>
                    </View></View>

                {/* Rental Period */}
                <View style={s.section}><Text style={s.sectionTitle}>Rental Period</Text>
                    <View style={s.card}>
                        <View style={s.infoRow}><Ionicons name="calendar-outline" size={20} color={C.textSecondary} /><Text style={s.infoLabel}>Start:</Text><Text style={s.infoValue}>{new Date(booking.startDate).toLocaleDateString()}</Text></View>
                        <View style={s.infoRow}><Ionicons name="calendar" size={20} color={C.textSecondary} /><Text style={s.infoLabel}>End:</Text><Text style={s.infoValue}>{new Date(booking.endDate).toLocaleDateString()}</Text></View>
                        <View style={s.infoRow}><Ionicons name="time-outline" size={20} color={C.textSecondary} /><Text style={s.infoLabel}>Duration:</Text><Text style={s.infoValue}>{booking.totalDays || 0} days</Text></View>
                    </View></View>

                {/* Price Summary */}
                <View style={s.section}><Text style={s.sectionTitle}>Price Summary</Text>
                    <View style={s.card}>
                        <View style={s.priceRow}><Text style={s.priceLabel}>Price Breakdown</Text><Text style={s.priceLabel}>₹{booking.pricePerDay}/day × {booking.quantity || 1} × {booking.totalDays || 0} days</Text></View>
                        <View style={s.divider} />
                        <View style={s.priceRow}><Text style={s.totalLabel}>Total Amount</Text><Text style={s.totalValue}>₹{booking.totalAmount?.toFixed(2)}</Text></View>
                    </View></View>

                {/* Review */}
                {booking.hasReview && booking.review && (
                    <View style={s.section}><Text style={s.sectionTitle}>Customer Review</Text>
                        <View style={s.card}><View style={s.starsRow}>{renderStars(booking.review.rating)}</View>
                            {booking.review.comment && <Text style={s.reviewComment}>"{booking.review.comment}"</Text>}
                            <Text style={s.reviewDate}>Reviewed on {new Date(booking.review.reviewDate).toLocaleDateString()}</Text></View></View>)}

                {/* Actions */}
                <View style={s.actionsC}>
                    {booking.status === "pending" && (<>
                        <TouchableOpacity style={s.confirmBtn} onPress={() => updateBookingStatus("confirmed")}><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={s.actionBtnText}>Confirm Booking</Text></TouchableOpacity>
                        <TouchableOpacity style={s.rejectBtn} onPress={() => updateBookingStatus("cancelled")}><Ionicons name="close-circle-outline" size={20} color="#fff" /><Text style={s.actionBtnText}>Reject</Text></TouchableOpacity></>)}
                    {booking.status === "confirmed" && (<TouchableOpacity style={s.progressBtn} onPress={() => updateBookingStatus("in-progress")}><Ionicons name="play-circle-outline" size={20} color="#fff" /><Text style={s.actionBtnText}>Mark as In Progress</Text></TouchableOpacity>)}
                    {booking.status === "in-progress" && (<TouchableOpacity style={s.completeBtn} onPress={() => updateBookingStatus("completed")}><Ionicons name="checkmark-done-circle-outline" size={20} color="#fff" /><Text style={s.actionBtnText}>Mark as Completed</Text></TouchableOpacity>)}
                    {booking.status === "completed" && booking.paymentMethod === "cod" && booking.paymentStatus === "pending" && (
                        <TouchableOpacity style={s.paidBtn} onPress={updatePaymentStatus}><Ionicons name="cash-outline" size={20} color="#fff" /><Text style={s.actionBtnText}>Mark as Paid</Text></TouchableOpacity>)}
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
    hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    hdrT: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
    loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.7)", zIndex: 10, justifyContent: "center", alignItems: "center" },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: C.card, padding: 20, borderRadius: 18, marginBottom: 16, elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder },
    orderId: { fontSize: 18, fontWeight: "700", color: C.text },
    orderDate: { fontSize: 14, color: C.textMuted, marginTop: 4 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    statusText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 16, letterSpacing: 0.2 },
    card: { backgroundColor: C.card, padding: 20, borderRadius: 18, elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
    infoLabel: { fontSize: 15, color: C.textSecondary, marginLeft: 0 },
    infoValue: { fontSize: 15, color: C.text, fontWeight: "600", flex: 1 },
    eqRow: { flexDirection: "row", alignItems: "center" },
    iconC: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.lightTeal, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    eqName: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 4 },
    qty: { fontSize: 14, color: C.secondary, fontWeight: "600" },
    payRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    payLabel: { fontSize: 15, color: C.textSecondary },
    payMethodBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.successBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#C8E6D4' },
    payMethodText: { fontSize: 13, color: C.success, fontWeight: "600" },
    payStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    payStatusText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    priceLabel: { fontSize: 14, color: C.textSecondary },
    divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
    totalLabel: { fontSize: 16, fontWeight: "700", color: C.text },
    totalValue: { fontSize: 20, fontWeight: "800", color: C.success },
    starsRow: { flexDirection: "row", marginBottom: 10 },
    reviewComment: { fontSize: 15, color: C.text, lineHeight: 22, marginBottom: 10, fontStyle: "italic" },
    reviewDate: { fontSize: 12, color: C.textMuted },
    actionsC: { marginTop: 10, gap: 12, marginBottom: 20 },
    confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.success, padding: 18, borderRadius: 15, gap: 10, shadowColor: C.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    rejectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.danger, padding: 18, borderRadius: 15, gap: 10, shadowColor: C.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    progressBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.secondary, padding: 18, borderRadius: 15, gap: 10, shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    completeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: '#8b5cf6', padding: 18, borderRadius: 15, gap: 10, shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    paidBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.success, padding: 18, borderRadius: 15, gap: 10, shadowColor: C.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
