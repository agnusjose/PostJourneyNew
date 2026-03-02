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
  textMuted: '#8AACB8', danger: '#C0392B', lightTeal: '#E0F2F7',
};

const PaymentFailed = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { error, type, amount } = route.params || {};

  const getTitle = () => {
    if (type === 'booking') return "Booking Failed";
    if (type === 'listing_fee') return "Listing Failed";
    if (type === 'consultation') return "Consultation Payment Failed";
    return "Payment Failed";
  };

  const getMessage = () => {
    if (type === 'booking') return "We couldn't process your booking payment. Please try again or use a different payment method.";
    if (type === 'listing_fee') return "We couldn't process your listing fee payment. Your equipment will not be listed until payment is successful.";
    if (type === 'consultation') return "We couldn't process your consultation payment. Please try again or use a different payment method.";
    return "We couldn't process your payment. Please try again.";
  };

  const handleRetry = () => { navigation.goBack(); };

  const handleGoHome = () => {
    if (!user) { navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] }); return; }
    if (user.userType === "service-provider" || user.userType === "service provider") {
      navigation.reset({ index: 0, routes: [{ name: "ServiceProviderDashboard", params: { userId: user.userId, userName: user.name, userEmail: user.email } }] });
    } else if (user.userType === "patient") {
      navigation.reset({ index: 0, routes: [{ name: "PatientDashboard", params: { userId: user.userId, userName: user.name, userEmail: user.email } }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] });
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
        <View style={s.hdr}><View style={{ width: 40 }} /><Text style={s.hdrT}>Payment Status</Text><View style={{ width: 40 }} /></View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content}>
        {/* Error Icon */}
        <View style={s.iconC}>
          <View style={s.iconCircle}>
            <Ionicons name="alert-outline" size={60} color="#fff" />
          </View>
        </View>

        <Text style={s.title}>{getTitle()}</Text>
        <Text style={s.message}>{getMessage()}</Text>

        {error && (
          <View style={s.errorCard}>
            <View style={s.errorHeader}>
              <Ionicons name="information-circle" size={20} color={C.danger} />
              <Text style={s.errorTitle}>Error Details</Text>
            </View>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {amount && (
          <View style={s.amountCard}>
            <Text style={s.amountLabel}>Attempted Amount</Text>
            <Text style={s.amountValue}>₹{amount}</Text>
          </View>
        )}

        <View style={s.btnC}>
          <TouchableOpacity style={s.retryBtn} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={s.retryBtnText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.homeBtn} onPress={handleGoHome}>
            <Text style={s.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.helpText}>
          If the problem persists, please contact support.
        </Text>
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
    width: 100, height: 100, borderRadius: 50, backgroundColor: C.danger,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.danger, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  title: { fontSize: 28, fontWeight: "800", color: C.danger, marginBottom: 12, textAlign: "center", letterSpacing: -0.5 },
  message: { fontSize: 16, color: C.textSecondary, textAlign: "center", marginBottom: 40, lineHeight: 24, paddingHorizontal: 20 },

  errorCard: {
    width: '100%', backgroundColor: "#FDEDED", borderRadius: 15, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: "#F5C6C6",
  },
  errorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  errorTitle: { fontSize: 15, fontWeight: "700", color: C.danger },
  errorText: { fontSize: 14, color: '#8B1A1A', lineHeight: 20 },

  amountCard: {
    width: '100%', backgroundColor: C.card, borderRadius: 15, padding: 20,
    marginBottom: 30, alignItems: 'center', elevation: 2,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  amountLabel: { fontSize: 13, color: C.textMuted, fontWeight: "600", textTransform: 'uppercase', marginBottom: 4 },
  amountValue: { fontSize: 24, fontWeight: "800", color: C.text },

  btnC: { width: "100%", gap: 16, marginBottom: 24 },

  retryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.danger, padding: 18, borderRadius: 15, gap: 10,
    shadowColor: C.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  retryBtnText: { fontSize: 16, color: "#fff", fontWeight: "700" },

  homeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.card, padding: 18, borderRadius: 15, gap: 10,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  homeBtnText: { fontSize: 16, color: C.textSecondary, fontWeight: "700" },

  helpText: { fontSize: 13, color: C.textMuted, fontStyle: "italic" },
});

export default PaymentFailed;
