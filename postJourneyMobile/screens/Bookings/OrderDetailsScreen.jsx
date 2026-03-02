import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

const C = {
    primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
    cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
    textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
    warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B', dangerBg: '#FDEDED',
    lightTeal: '#E0F2F7',
};

export default function OrderDetailsScreen({ navigation, route }) {
    const { booking: initialBooking } = route.params;
    const [booking, setBooking] = useState(initialBooking);
    const [loading, setLoading] = useState(false);
    const BASE_URL = "http://10.63.72.99:5000";

    useFocusEffect(useCallback(() => {
        const fetchUpdatedBooking = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/booking/${initialBooking._id}`);
                if (res.data.success && res.data.booking) setBooking(res.data.booking);
            } catch (error) { console.log("Could not refresh booking:", error.message); }
        };
        fetchUpdatedBooking();
    }, [initialBooking._id]));

    const statusSteps = ["pending", "confirmed", "in-progress", "completed"];
    const currentStepIndex = statusSteps.indexOf(booking.status);
    const isCancelled = booking.status === "cancelled";

    const getStatusColor = (status) => {
        switch (status) {
            case "confirmed": return C.success;
            case "in-progress": return C.secondary;
            case "completed": return '#8b5cf6';
            case "cancelled": return C.danger;
            default: return C.warning;
        }
    };

    const getStepLabel = (step) => {
        switch (step) { case "pending": return "Order Placed"; case "confirmed": return "Confirmed"; case "in-progress": return "In Progress"; case "completed": return "Completed"; default: return step; }
    };

    const handleCancelOrder = () => {
        Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
            { text: "No", style: "cancel" },
            { text: "Yes, Cancel", style: "destructive", onPress: () => { Alert.alert("Info", "Order cancellation functionality will be implemented"); } }
        ]);
    };

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
                <View style={s.hdrRow}>
                    <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                    <Text style={s.hdrT}>Order Details</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Order ID & Status */}
                <View style={s.orderHeader}>
                    <View><Text style={s.orderId}>Order #{booking._id?.slice(-8).toUpperCase()}</Text>
                        <Text style={s.orderDate}>Placed on {new Date(booking.createdAt || booking.startDate).toLocaleDateString()}</Text></View>
                    <View style={[s.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                        <Text style={s.statusText}>{booking.status?.toUpperCase() || "PENDING"}</Text></View>
                </View>

                {/* Order Tracking */}
                <View style={s.section}><Text style={s.sectionTitle}>Order Tracking</Text>
                    <View style={s.trackingCard}>
                        {isCancelled ? (
                            <View style={s.cancelledC}><Ionicons name="close-circle" size={48} color={C.danger} />
                                <Text style={s.cancelledT}>Order Cancelled</Text>
                                {booking.cancellationReason && <Text style={s.cancelR}>Reason: {booking.cancellationReason}</Text>}</View>
                        ) : statusSteps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            const isLast = index === statusSteps.length - 1;
                            return (
                                <View key={step} style={s.stepC}>
                                    <View style={s.stepIC}>
                                        <View style={[s.stepCircle, isCompleted && s.stepCircleDone, isCurrent && s.stepCircleCur]}>
                                            {isCompleted && <Ionicons name={isCurrent ? "radio-button-on" : "checkmark"} size={16} color="#fff" />}
                                        </View>
                                        {!isLast && <View style={[s.stepLine, index < currentStepIndex && s.stepLineDone]} />}
                                    </View>
                                    <View style={s.stepContent}><Text style={[s.stepLabel, isCompleted && s.stepLabelDone, isCurrent && s.stepLabelCur]}>{getStepLabel(step)}</Text></View>
                                </View>);
                        })}
                    </View>
                </View>

                {/* Equipment Details */}
                <View style={s.section}><Text style={s.sectionTitle}>Equipment Details</Text>
                    <View style={s.card}><Text style={s.eqName}>{booking.equipmentName || "Equipment"}</Text>
                        <Text style={s.provName}>Provider: {booking.providerName || "N/A"}</Text>
                        <Text style={s.qty}>Quantity: {booking.quantity || 1}</Text></View></View>

                {/* Rental Period */}
                <View style={s.section}><Text style={s.sectionTitle}>Rental Period</Text>
                    <View style={s.card}>
                        <View style={s.infoRow}><Ionicons name="calendar-outline" size={20} color={C.textSecondary} /><Text style={s.infoLabel}>Start Date:</Text><Text style={s.infoValue}>{new Date(booking.startDate).toLocaleDateString()}</Text></View>
                        <View style={s.infoRow}><Ionicons name="calendar" size={20} color={C.textSecondary} /><Text style={s.infoLabel}>End Date:</Text><Text style={s.infoValue}>{new Date(booking.endDate).toLocaleDateString()}</Text></View>
                        <View style={s.infoRow}><Ionicons name="time-outline" size={20} color={C.textSecondary} /><Text style={s.infoLabel}>Duration:</Text><Text style={s.infoValue}>{booking.totalDays || 0} days</Text></View>
                    </View></View>

                {/* Price Summary */}
                <View style={s.section}><Text style={s.sectionTitle}>Price Summary</Text>
                    <View style={s.card}>
                        <View style={s.priceRow}><Text style={s.priceLabel}>Price per day</Text><Text style={s.priceValue}>₹{booking.pricePerDay?.toFixed(2) || "0.00"}</Text></View>
                        <View style={s.priceRow}><Text style={s.priceLabel}>Quantity</Text><Text style={s.priceValue}>× {booking.quantity || 1}</Text></View>
                        <View style={s.priceRow}><Text style={s.priceLabel}>Duration</Text><Text style={s.priceValue}>× {booking.totalDays || 0} days</Text></View>
                        <View style={s.divider} />
                        <View style={s.priceRow}><Text style={s.totalLabel}>Total Amount</Text><Text style={s.totalValue}>₹{booking.totalAmount?.toFixed(2) || "0.00"}</Text></View>
                    </View></View>

                {/* Delivery */}
                <View style={s.section}><Text style={s.sectionTitle}>Delivery Information</Text>
                    <View style={s.card}>
                        <View style={s.infoRow}><Ionicons name="location-outline" size={20} color={C.textSecondary} /><Text style={s.addressText}>{booking.deliveryAddress || "Not provided"}</Text></View>
                        <View style={s.infoRow}><Ionicons name="call-outline" size={20} color={C.textSecondary} /><Text style={s.phoneText}>{booking.contactPhone || "Not provided"}</Text></View>
                    </View></View>

                {/* Payment */}
                <View style={s.section}><Text style={s.sectionTitle}>Payment</Text>
                    <View style={s.card}>
                        <View style={s.payRow}><Text style={s.payLabel}>Method</Text>
                            <View style={s.payMethodBadge}>
                                <Ionicons name={booking.paymentMethod === "cod" ? "cash-outline" : booking.paymentMethod === "upi" ? "phone-portrait-outline" : booking.paymentMethod === "card" ? "card-outline" : "help-circle-outline"} size={16} color={C.textSecondary} />
                                <Text style={s.payMethodText}>{booking.paymentMethod === "cod" ? "Cash on Delivery" : booking.paymentMethod === "upi" ? "UPI" : booking.paymentMethod === "card" ? "Card" : booking.paymentMethod === "netbanking" ? "Net Banking" : booking.paymentMethod === "wallet" ? "Wallet" : "Pending"}</Text>
                            </View></View>
                        <View style={[s.payRow, { marginTop: 12 }]}><Text style={s.payLabel}>Status</Text>
                            <View style={[s.payBadge, { backgroundColor: booking.paymentStatus === "paid" ? C.successBg : C.warningBg }]}>
                                <Text style={[s.payBadgeText, { color: booking.paymentStatus === "paid" ? C.success : C.warning }]}>{booking.paymentStatus?.toUpperCase() || "PENDING"}</Text>
                            </View></View>
                    </View></View>

                {/* Notes */}
                {booking.notes && (<View style={s.section}><Text style={s.sectionTitle}>Notes</Text><View style={s.card}><Text style={s.notesText}>{booking.notes}</Text></View></View>)}

                {/* Review */}
                {booking.status === "completed" && (
                    <View style={s.section}><Text style={s.sectionTitle}>Your Review</Text>
                        {booking.hasReview && booking.review ? (
                            <View style={s.card}>
                                <View style={s.reviewStars}>{[1, 2, 3, 4, 5].map((star) => (<Ionicons key={star} name={star <= booking.review.rating ? "star" : "star-outline"} size={20} color={star <= booking.review.rating ? "#fbbf24" : "#d1d5db"} />))}
                                    <Text style={s.reviewRatingText}>{booking.review.rating}/5</Text></View>
                                {booking.review.comment ? <Text style={s.reviewComment}>"{booking.review.comment}"</Text> : null}
                                <Text style={s.reviewDate}>Reviewed on {new Date(booking.review.reviewDate).toLocaleDateString()}</Text>
                            </View>
                        ) : (
                            <TouchableOpacity style={s.writeReviewCard} onPress={() => navigation.navigate("WriteReviewScreen", { booking })}>
                                <Ionicons name="star-outline" size={24} color={C.secondary} />
                                <View style={s.writeReviewText}><Text style={s.writeReviewTitle}>Rate this equipment</Text><Text style={s.writeReviewSub}>Share your experience with others</Text></View>
                                <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>)}

                {/* Cancel */}
                {booking.status === "pending" && (
                    <TouchableOpacity style={s.cancelButton} onPress={handleCancelOrder}>
                        <Ionicons name="close-circle-outline" size={20} color={C.danger} /><Text style={s.cancelButtonText}>Cancel Order</Text>
                    </TouchableOpacity>)}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
    hdrRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    hdrT: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: C.card, padding: 20, borderRadius: 18, marginBottom: 20, elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder },
    orderId: { fontSize: 18, fontWeight: "800", color: C.text },
    orderDate: { fontSize: 14, color: C.textSecondary, marginTop: 4, fontWeight: "500" },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 12, letterSpacing: 0.2 },
    card: { backgroundColor: C.card, padding: 20, borderRadius: 18, elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder },
    trackingCard: { backgroundColor: C.card, padding: 20, borderRadius: 18, elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder },
    cancelledC: { alignItems: "center", padding: 20 },
    cancelledT: { fontSize: 18, fontWeight: "700", color: C.danger, marginTop: 12 },
    cancelR: { fontSize: 14, color: C.textSecondary, marginTop: 4, textAlign: "center" },
    stepC: { flexDirection: "row", alignItems: "flex-start" },
    stepIC: { alignItems: "center", width: 40 },
    stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.lightTeal, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.cardBorder },
    stepCircleDone: { backgroundColor: C.success, borderColor: C.success },
    stepCircleCur: { backgroundColor: C.secondary, borderColor: C.secondary },
    stepLine: { width: 2, height: 30, backgroundColor: C.cardBorder, marginVertical: 4 },
    stepLineDone: { backgroundColor: C.success },
    stepContent: { flex: 1, paddingLeft: 12, paddingTop: 4 },
    stepLabel: { fontSize: 14, color: C.textMuted, fontWeight: "500" },
    stepLabelDone: { color: C.success, fontWeight: "600" },
    stepLabelCur: { color: C.secondary, fontWeight: "700" },
    eqName: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 6 },
    provName: { fontSize: 14, color: C.textSecondary, marginBottom: 6, fontWeight: "500" },
    qty: { fontSize: 14, color: C.secondary, fontWeight: "600" },
    infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    infoLabel: { fontSize: 14, color: C.textSecondary, marginLeft: 12, flex: 1, fontWeight: "500" },
    infoValue: { fontSize: 15, color: C.text, fontWeight: "600" },
    addressText: { fontSize: 14, color: C.text, marginLeft: 12, flex: 1, fontWeight: "500", lineHeight: 20 },
    phoneText: { fontSize: 14, color: C.text, marginLeft: 12, flex: 1, fontWeight: "600" },
    priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    priceLabel: { fontSize: 14, color: C.textSecondary, fontWeight: "500" },
    priceValue: { fontSize: 14, color: C.text, fontWeight: "600" },
    divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
    totalLabel: { fontSize: 16, fontWeight: "700", color: C.text },
    totalValue: { fontSize: 20, fontWeight: "800", color: C.success },
    payRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    payLabel: { fontSize: 14, color: C.textSecondary, fontWeight: "500" },
    payBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    payBadgeText: { fontSize: 12, fontWeight: "700" },
    payMethodBadge: { flexDirection: "row", alignItems: "center", backgroundColor: C.lightTeal, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, gap: 6, borderWidth: 1, borderColor: C.cardBorder },
    payMethodText: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
    notesText: { fontSize: 14, color: C.textSecondary, lineHeight: 22 },
    cancelButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.dangerBg, padding: 16, borderRadius: 15, borderWidth: 1, borderColor: '#F5C6C6', marginTop: 8 },
    cancelButtonText: { color: C.danger, fontSize: 16, fontWeight: "700", marginLeft: 8 },
    reviewStars: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    reviewRatingText: { fontSize: 14, fontWeight: "700", color: C.text, marginLeft: 8 },
    reviewComment: { fontSize: 14, color: C.textSecondary, fontStyle: "italic", marginBottom: 8, lineHeight: 20 },
    reviewDate: { fontSize: 12, color: C.textMuted, textAlign: "right" },
    writeReviewCard: { backgroundColor: C.card, padding: 20, borderRadius: 18, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.cardBorder, elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
    writeReviewText: { flex: 1, marginLeft: 16 },
    writeReviewTitle: { fontSize: 16, fontWeight: "700", color: C.text },
    writeReviewSub: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
});
