import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
  cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
  textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
  lightTeal: '#E0F2F7',
};

const PaymentSuccess = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const { transaction, type, amount, equipmentId, bookingId, patientId, providerId } = route.params || {};
  const successTransaction = transaction || route.params?.paymentResult?.transaction;

  const getTitle = () => {
    if (type === 'booking') return "Booking Confirmed!";
    if (type === 'listing_fee') return "Equipment Listed!";
    if (type === 'consultation') return "Consultation Booked!";
    return "Payment Successful!";
  };

  const getMessage = () => {
    if (type === 'booking') return "Your equipment booking has been confirmed. You can view your bookings in the bookings section.";
    if (type === 'listing_fee') return "Your equipment has been listed successfully and is now available for patients to book.";
    if (type === 'consultation') return "Your doctor consultation has been booked successfully. You can view your consultations in the Consult Doctor section.";
    return "Your payment was processed successfully.";
  };

  const handleDone = () => {
    if (user?.userType === "patient") {
      navigation.reset({ index: 0, routes: [{ name: "PatientDashboard", params: { userId: user.userId, userName: user.name || "User", userEmail: user.email || "N/A" } }] });
    } else if (user?.userType === "service-provider" || user?.userType === "service provider") {
      navigation.reset({ index: 0, routes: [{ name: "ServiceProviderDashboard", params: { userId: user.userId, userName: user.name || "User", userEmail: user.email || "N/A" } }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] });
    }
  };

  const handleViewDetails = () => {
    if (type === 'booking') {
      if (user?.userType === "patient") navigation.navigate("PatientBookingsScreen", { patientId: user.userId, refresh: true });
      else if (user?.userType === "service-provider" || user?.userType === "service provider") navigation.navigate("ProviderBookingsScreen", { providerId: user.userId, refresh: true });
    } else if (type === 'consultation') {
      navigation.navigate("PatientConsultations");
    } else if (type === 'listing_fee') {
      if (user?.userType === "service-provider" || user?.userType === "service provider") navigation.navigate("EquipmentDashboardScreen", { providerId: user.userId, refresh: true });
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
        <View style={s.hdr}><View style={{ width: 40 }} /><Text style={s.hdrT}>Payment Status</Text><View style={{ width: 40 }} /></View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content}>
        {/* Success Icon */}
        <View style={s.iconC}>
          <View style={s.iconCircle}>
            <Ionicons name="checkmark-sharp" size={60} color="#fff" />
          </View>
        </View>

        <Text style={s.title}>{getTitle()}</Text>
        <Text style={s.message}>{getMessage()}</Text>

        {/* Transaction Details */}
        <View style={s.detailsCard}>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Amount Paid</Text>
            <Text style={s.detailValueHL}>₹{amount}</Text>
          </View>
          <View style={s.divider} />

          {successTransaction?.transactionId && (
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Transaction ID</Text>
              <Text style={s.detailValue}>{successTransaction.transactionId}</Text>
            </View>
          )}

          {successTransaction?.paymentMethod && (
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Payment Method</Text>
              <View style={s.methodBadge}>
                <Ionicons name="card-outline" size={14} color={C.secondary} />
                <Text style={s.methodText}>{successTransaction.paymentMethod.toUpperCase()}</Text>
              </View>
            </View>
          )}

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Status</Text>
            <View style={s.statusBadge}><Text style={s.statusText}>SUCCESS</Text></View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={s.btnC}>
          <TouchableOpacity style={s.detailsBtn} onPress={handleViewDetails}>
            <Ionicons name="documents-outline" size={20} color={C.secondary} />
            <Text style={s.detailsBtnText}>
              {type === 'booking' ? 'View Bookings' : type === 'consultation' ? 'View My Consultations' : 'View My Equipment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.doneBtn} onPress={handleDone}>
            <LinearGradient colors={[C.primary, C.secondary]} style={s.doneBtnG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.doneBtnText}>Back to Home</Text>
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
    backgroundColor: C.card, borderRadius: 20, padding: 24, width: "100%", marginBottom: 40,
    elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  detailLabel: { fontSize: 14, color: C.textMuted, fontWeight: "600" },
  detailValueHL: { fontSize: 22, fontWeight: "800", color: C.text },
  detailValue: { fontSize: 14, color: C.text, fontWeight: "600", maxWidth: '60%' },

  divider: { height: 1, backgroundColor: C.cardBorder, marginBottom: 16 },

  methodBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.lightTeal, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 },
  methodText: { fontSize: 12, fontWeight: "700", color: C.secondary },

  statusBadge: { backgroundColor: C.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "700", color: C.success },

  btnC: { width: "100%", gap: 16 },

  detailsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.card, padding: 18, borderRadius: 15, gap: 10,
    borderWidth: 1, borderColor: C.secondary,
    shadowColor: C.secondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  detailsBtnText: { fontSize: 16, color: C.secondary, fontWeight: "700" },

  doneBtn: { borderRadius: 15, overflow: 'hidden', elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  doneBtnG: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 18, gap: 10 },
  doneBtnText: { fontSize: 16, color: "#fff", fontWeight: "700" },
});

export default PaymentSuccess;
