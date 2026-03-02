import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
  cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
  textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
  lightTeal: '#E0F2F7',
};

const CashOnDeliverySuccess = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const [isConfirming, setIsConfirming] = useState(true);
  const [confirmError, setConfirmError] = useState(null);

  const BASE_URL = "http://192.168.172.72:5000";

  const { bookingId, bookingIds, amount, bookingData } = route.params || {};

  useEffect(() => {
    const confirmCODBookings = async () => {
      try {
        const allBookingIds = bookingIds && bookingIds.length > 0
          ? bookingIds
          : (bookingId ? [bookingId] : []);

        if (allBookingIds.length === 0) {
          setIsConfirming(false);
          return;
        }

        for (const id of allBookingIds) {
          await axios.put(`${BASE_URL}/booking/confirm-cod/${id}`);
        }

        setIsConfirming(false);
      } catch (error) {
        console.error("Error confirming COD booking:", error);
        setConfirmError("Booking placed but confirmation pending. Check My Orders.");
        setIsConfirming(false);
      }
    };

    confirmCODBookings();
  }, [bookingId, bookingIds]);

  const handleGoHome = () => {
    if (!user) { navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] }); return; }
    if (user.userType === "patient") {
      navigation.reset({ index: 0, routes: [{ name: "PatientEquipmentList", params: { userId: user.userId, userName: user.name || "User", userEmail: user.email || "N/A" } }] });
    } else if (user.userType === "service-provider" || user.userType === "service provider") {
      navigation.reset({ index: 0, routes: [{ name: "ServiceProviderDashboard", params: { userId: user.userId, userName: user.name || "User", userEmail: user.email || "N/A" } }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] });
    }
  };

  const handleViewBooking = () => {
    if (user?.userType === "patient") {
      navigation.navigate("PatientBookingsScreen", { patientId: user.userId, refresh: true });
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
        <View style={s.hdr}><View style={{ width: 40 }} /><Text style={s.hdrT}>Order Confirmed</Text><View style={{ width: 40 }} /></View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content}>
        {/* Success Icon */}
        <View style={s.iconC}>
          <View style={s.iconCircle}>
            <Ionicons name="checkmark-sharp" size={60} color="#fff" />
          </View>
        </View>

        <Text style={s.title}>Order Confirmed!</Text>
        <Text style={s.message}>
          Your order has been placed successfully. Please pay the driver upon delivery.
        </Text>

        {/* Details Card */}
        <View style={s.detailsCard}>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Amount to Pay</Text>
            <Text style={s.detailValueHL}>₹{amount}</Text>
          </View>
          <View style={s.divider} />

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Order ID</Text>
            <Text style={s.detailValue}>{bookingId?.substring(0, 8).toUpperCase() || 'N/A'}...</Text>
          </View>

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Payment Method</Text>
            <View style={s.methodBadge}>
              <Ionicons name="cash-outline" size={14} color={C.success} />
              <Text style={s.methodText}>CASH ON DELIVERY</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={s.instructionsCard}>
          <View style={s.instrHeader}>
            <Ionicons name="information-circle-outline" size={20} color={C.secondary} />
            <Text style={s.instrTitle}>Important Instructions</Text>
          </View>
          <View style={s.instrItem}>
            <Text style={s.bullet}>•</Text>
            <Text style={s.instrText}>Keep cash ready when equipment arrives.</Text>
          </View>
          <View style={s.instrItem}>
            <Text style={s.bullet}>•</Text>
            <Text style={s.instrText}>Verify equipment condition before payment.</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={s.btnC}>
          <TouchableOpacity style={s.viewBtn} onPress={handleViewBooking}>
            <Ionicons name="documents-outline" size={20} color={C.secondary} />
            <Text style={s.viewBtnText}>View My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.homeBtn} onPress={handleGoHome}>
            <LinearGradient colors={[C.primary, C.secondary]} style={s.homeBtnG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.homeBtnText}>Back to Home</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hdrT: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },

  content: { flexGrow: 1, padding: 30, alignItems: "center", justifyContent: "center" },

  iconC: { marginBottom: 30, alignItems: 'center' },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: C.success,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  title: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 12, textAlign: "center", letterSpacing: -0.5 },
  message: { fontSize: 16, color: C.textSecondary, textAlign: "center", marginBottom: 40, lineHeight: 24, paddingHorizontal: 20 },

  detailsCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 24, width: "100%", marginBottom: 20,
    elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  detailLabel: { fontSize: 14, color: C.textMuted, fontWeight: "600" },
  detailValueHL: { fontSize: 22, fontWeight: "800", color: C.text },
  detailValue: { fontSize: 14, color: C.text, fontWeight: "600" },

  divider: { height: 1, backgroundColor: C.cardBorder, marginBottom: 16 },

  methodBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 },
  methodText: { fontSize: 12, fontWeight: "700", color: C.success },

  instructionsCard: {
    width: '100%', backgroundColor: C.lightTeal, borderRadius: 15, padding: 20,
    marginBottom: 30, borderWidth: 1, borderColor: C.cardBorder,
  },
  instrHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  instrTitle: { fontSize: 15, fontWeight: "700", color: C.primary },
  instrItem: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  bullet: { fontSize: 16, color: C.primary, marginRight: 8, lineHeight: 20 },
  instrText: { fontSize: 14, color: C.primary, lineHeight: 20, flex: 1 },

  btnC: { width: "100%", gap: 16 },

  viewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.card, padding: 18, borderRadius: 15, gap: 10,
    borderWidth: 1, borderColor: C.secondary,
    shadowColor: C.secondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  viewBtnText: { fontSize: 16, color: C.secondary, fontWeight: "700" },

  homeBtn: { borderRadius: 15, overflow: 'hidden', elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  homeBtnG: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 18, gap: 10 },
  homeBtnText: { fontSize: 16, color: "#fff", fontWeight: "700" },
});

export default CashOnDeliverySuccess;
