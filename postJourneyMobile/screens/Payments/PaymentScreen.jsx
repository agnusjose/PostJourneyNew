import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, StatusBar
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
  cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
  textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
  warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B',
  lightTeal: '#E0F2F7',
};

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const BASE_URL = "http://192.168.172.72:5000";

  const {
    type, amount, bookingId, bookingIds, equipmentId, providerId, bookingData
  } = route.params || {};

  const [selectedMethod, setSelectedMethod] = useState("");
  const [selectedSubtype, setSelectedSubtype] = useState("");
  const [upiId, setUpiId] = useState("");
  const [cardDetails, setCardDetails] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentTitle = type === 'booking' ? 'Booking Payment' : type === 'consultation' ? 'Consultation Payment' : 'Listing Fee Payment';
  const description = type === 'booking'
    ? 'Complete payment to confirm your booking'
    : type === 'consultation'
      ? 'Complete payment to confirm your doctor consultation'
      : 'Pay 5% listing fee to list your equipment';

  const paymentOptions = (type === 'listing_fee' || type === 'consultation')
    ? [
      {
        id: "upi", name: "UPI", icon: "phone-portrait-outline", color: C.success,
        subtypes: [
          { id: "google_pay", name: "Google Pay", icon: "logo-google" },
          { id: "phonepe", name: "PhonePe", icon: "phone-portrait-outline" },
          { id: "paytm", name: "Paytm", icon: "wallet-outline" },
          { id: "other_upi", name: "Other UPI", icon: "qr-code-outline" }
        ]
      },
      {
        id: "card", name: "Debit/Credit Card", icon: "card-outline", color: C.secondary,
        subtypes: [
          { id: "visa", name: "Visa", icon: "card-outline" },
          { id: "mastercard", name: "MasterCard", icon: "card-outline" },
          { id: "amex", name: "American Express", icon: "card-outline" },
          { id: "razorpay", name: "Razorpay Card", icon: "card-outline" }
        ]
      },
      {
        id: "netbanking", name: "Net Banking", icon: "business-outline", color: '#8b5cf6',
        subtypes: [
          { id: "hdfc", name: "HDFC Bank", icon: "business-outline" },
          { id: "icici", name: "ICICI Bank", icon: "business-outline" },
          { id: "sbi", name: "SBI", icon: "business-outline" }
        ]
      }
    ]
    : [
      {
        id: "upi", name: "UPI", icon: "phone-portrait-outline", color: C.success,
        subtypes: [
          { id: "google_pay", name: "Google Pay", icon: "logo-google" },
          { id: "phonepe", name: "PhonePe", icon: "phone-portrait-outline" },
          { id: "paytm", name: "Paytm", icon: "wallet-outline" },
          { id: "other_upi", name: "Other UPI", icon: "qr-code-outline" }
        ]
      },
      {
        id: "card", name: "Debit/Credit Card", icon: "card-outline", color: C.secondary,
        subtypes: [
          { id: "visa", name: "Visa", icon: "card-outline" },
          { id: "mastercard", name: "MasterCard", icon: "card-outline" },
          { id: "amex", name: "American Express", icon: "card-outline" },
          { id: "razorpay", name: "Razorpay Card", icon: "card-outline" }
        ]
      },
      {
        id: "netbanking", name: "Net Banking", icon: "business-outline", color: '#8b5cf6',
        subtypes: [
          { id: "hdfc", name: "HDFC Bank", icon: "business-outline" },
          { id: "icici", name: "ICICI Bank", icon: "business-outline" },
          { id: "sbi", name: "SBI", icon: "business-outline" }
        ]
      },
      { id: "cod", name: "Cash on Delivery", icon: "cash-outline", color: C.warning, subtypes: [] }
    ];

  const prefillTestCard = (cardType) => {
    const testCards = {
      visa: { number: "4242 4242 4242 4242", expiry: "12/30", cvv: "123", name: "User" },
      mastercard: { number: "5555 5555 5555 4444", expiry: "12/30", cvv: "123", name: "User" },
      amex: { number: "3782 8224 1000 1112", expiry: "12/30", cvv: "1234", name: "User" }
    };
    setCardDetails(testCards[cardType] || testCards.visa);
  };

  const generateMockUPI = () => {
    const upiHandles = ['@okicici', '@axisbank', '@ybl', '@paytm'];
    const handle = upiHandles[Math.floor(Math.random() * upiHandles.length)];
    const mockUPI = `${user?.phoneNumber?.slice(-10) || '9876543210'}${handle}`;
    setUpiId(mockUPI);
    return mockUPI;
  };

  const markEquipmentAsListed = async (equipId, transactionId) => {
    try {
      const response = await fetch(`${BASE_URL}/equipment/${equipId}/mark-listed`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, paymentMethod: selectedMethod }),
      });
      const result = await response.json();
      if (!result.success) console.warn("Failed to mark listed:", result.message);
    } catch (error) {
      console.error("Error marking listed:", error);
    }
  };

  const renderSubtypes = (method) => {
    if (selectedMethod !== method.id || !method.subtypes || method.subtypes.length === 0) return null;

    return (
      <View style={s.subtypesC}>
        <Text style={s.subtypeLabel}>Select Option:</Text>
        <View style={s.subtypeBtns}>
          {method.subtypes.map((subtype) => (
            <TouchableOpacity
              key={subtype.id}
              style={[s.subtypeBtn, selectedSubtype === subtype.id && s.subtypeBtnActive]}
              onPress={() => {
                setSelectedSubtype(subtype.id);
                if (method.id === 'card' && subtype.id !== 'razorpay') prefillTestCard(subtype.id);
                if (method.id === 'upi' && subtype.id === 'other_upi') generateMockUPI();
              }}
            >
              <Ionicons name={subtype.icon} size={18} color={selectedSubtype === subtype.id ? C.secondary : C.textSecondary} />
              <Text style={[s.subtypeBtnText, selectedSubtype === subtype.id && s.subtypeBtnTextActive]}>
                {subtype.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPaymentDetailsInputs = () => {
    if (selectedMethod === 'upi' && selectedSubtype === 'other_upi') {
      return (
        <View style={s.inputC}>
          <Text style={s.inputLabel}>Enter UPI ID:</Text>
          <TextInput style={s.inputField} placeholder="example@upi" placeholderTextColor={C.textMuted}
            value={upiId} onChangeText={setUpiId} autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.inputNote}>Example: 9876543210@okicici</Text>
          <TouchableOpacity style={s.testBtn} onPress={generateMockUPI}>
            <Text style={s.testBtnText}>Generate Test UPI ID</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (selectedMethod === 'card' && selectedSubtype !== 'razorpay') {
      return (
        <View style={s.inputC}>
          <Text style={s.inputLabel}>Card Details:</Text>
          <TextInput style={s.inputField} placeholder="Card Number" placeholderTextColor={C.textMuted}
            value={cardDetails.number} onChangeText={(text) => setCardDetails({ ...cardDetails, number: text })}
            keyboardType="numeric" maxLength={19} />
          <View style={s.rowInputs}>
            <TextInput style={[s.inputField, { flex: 1, marginRight: 8 }]} placeholder="MM/YY" placeholderTextColor={C.textMuted}
              value={cardDetails.expiry} onChangeText={(text) => setCardDetails({ ...cardDetails, expiry: text })} maxLength={5} />
            <TextInput style={[s.inputField, { flex: 1, marginLeft: 8 }]} placeholder="CVV" placeholderTextColor={C.textMuted}
              value={cardDetails.cvv} onChangeText={(text) => setCardDetails({ ...cardDetails, cvv: text })}
              keyboardType="numeric" maxLength={4} secureTextEntry />
          </View>
          <TextInput style={s.inputField} placeholder="Cardholder Name" placeholderTextColor={C.textMuted}
            value={cardDetails.name} onChangeText={(text) => setCardDetails({ ...cardDetails, name: text })} />
          <TouchableOpacity style={s.testBtn} onPress={() => prefillTestCard(selectedSubtype || 'visa')}>
            <Text style={s.testBtnText}>Fill Test Card Data</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (selectedMethod === 'netbanking') {
      return (
        <View style={s.inputC}>
          <Text style={s.inputLabel}>Net Banking Details:</Text>
          <Text style={s.infoText}>You will be redirected to your bank's secure portal for payment.</Text>
          {selectedSubtype && (
            <Text style={s.bankSelected}>
              Selected Bank: {paymentOptions.find(m => m.id === 'netbanking')?.subtypes?.find(st => st.id === selectedSubtype)?.name || 'Bank'}
            </Text>
          )}
        </View>
      );
    }

    if (selectedMethod === 'cod') {
      return (
        <View style={s.inputC}>
          <Text style={s.inputLabel}>Cash on Delivery:</Text>
          <Text style={s.infoText}>Pay in cash when the equipment is delivered to you.</Text>
          <View style={s.warningC}>
            <Ionicons name="alert-circle-outline" size={16} color={C.warning} />
            <Text style={s.warningText}>Note: A small convenience fee may apply.</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const processPayment = async () => {
    if (!selectedMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }
    const selectedMethodObj = paymentOptions.find(m => m.id === selectedMethod);
    if (selectedMethodObj?.subtypes && selectedMethodObj.subtypes.length > 0 && !selectedSubtype) {
      Alert.alert("Error", `Please select a ${selectedMethodObj.name} option`);
      return;
    }
    if (selectedMethod === 'upi' && selectedSubtype === 'other_upi' && !upiId.trim()) {
      Alert.alert("Error", "Please enter your UPI ID");
      return;
    }
    if (selectedMethod === 'card' && selectedSubtype !== 'razorpay') {
      if (!cardDetails.number || cardDetails.number.replace(/\s/g, '').length < 16) return Alert.alert("Error", "Valid card number required");
      if (!cardDetails.expiry || cardDetails.expiry.length < 5) return Alert.alert("Error", "Valid expiry required (MM/YY)");
      if (!cardDetails.cvv || cardDetails.cvv.length < 3) return Alert.alert("Error", "Valid CVV required");
      if (!cardDetails.name || cardDetails.name.trim() === '') return Alert.alert("Error", "Cardholder name required");
    }

    if ((selectedMethod === 'cod' || bookingData?.paymentMethod === 'cod') && type === 'booking') {
      navigation.navigate("CashOnDeliverySuccess", {
        bookingId,
        bookingIds: bookingIds || [bookingId],
        amount,
        bookingData: { ...bookingData, paymentMethod: 'cod' }
      });
      return;
    }

    setIsProcessing(true);

    try {
      let paymentDetails = {};
      if (selectedMethod === 'upi') {
        paymentDetails = selectedSubtype === 'other_upi' ? { upiId: upiId.trim() } : { upiApp: selectedSubtype };
      } else if (selectedMethod === 'card') {
        paymentDetails = { ...cardDetails, number: cardDetails.number.replace(/\s/g, '') };
      } else if (selectedMethod === 'netbanking') {
        paymentDetails = { bank: selectedSubtype };
      }

      let endpoint = "", payload = {};

      if (type === 'booking') {
        endpoint = "/payment/process";
        payload = { bookingId, bookingIds: bookingIds || [bookingId], paymentMethod: selectedMethod, simulate: "success", paymentDetails };
      } else if (type === 'consultation') {
        endpoint = "/api/book-consultation";
        payload = { ...bookingData, paymentMethod: selectedMethod, paymentDetails };
      } else if (type === 'listing_fee') {
        endpoint = "/payment/listing-fee";
        payload = { equipmentId, providerId: providerId || user?.userId, paymentMethod: selectedMethod, simulate: "success", paymentDetails };
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setIsProcessing(false);

      if (result.success) {
        if (type === 'listing_fee') await markEquipmentAsListed(equipmentId, result.transaction?.transactionId);
        navigation.navigate("PaymentSuccess", {
          transaction: result.transaction, type, amount, equipmentId, bookingId,
          patientId: user?.userId, providerId: user?.userId
        });
      } else {
        navigation.navigate("PaymentFailed", { error: result.message || result.error || "Payment failed", type, amount });
      }
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
      Alert.alert("Error", "Failed to process payment. Please try again.");
    }
  };

  if (isProcessing) {
    return (
      <View style={s.loadingC}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <ActivityIndicator size="large" color={C.secondary} />
        <Text style={s.loadingText}>Processing Payment...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
        <View style={s.hdr}>
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.hdrT}>{paymentTitle}</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Amount Card */}
        <View style={s.amountCard}>
          <Text style={s.amountLabel}>Total Payable</Text>
          <Text style={s.amountValue}>₹{amount}</Text>
          <View style={s.divider} />
          <Text style={s.amountDesc}>{description}</Text>
        </View>

        {/* Payment Methods */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Select Payment Method</Text>

          {paymentOptions.map((method) => (
            <View key={method.id} style={s.methodCard}>
              <TouchableOpacity
                style={[s.methodBtn, selectedMethod === method.id && s.methodBtnActive]}
                onPress={() => { setSelectedMethod(method.id); setSelectedSubtype(""); if (method.id === 'upi') generateMockUPI(); }}
              >
                <View style={[s.methodIcon, { backgroundColor: method.color }]}>
                  <Ionicons name={method.icon} size={22} color="#FFF" />
                </View>
                <Text style={s.methodName}>{method.name}</Text>
                <View style={[s.radioCircle, selectedMethod === method.id && s.radioCircleActive]}>
                  {selectedMethod === method.id && <View style={s.selectedRb} />}
                </View>
              </TouchableOpacity>
              {renderSubtypes(method)}
            </View>
          ))}
        </View>

        {renderPaymentDetailsInputs()}
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[
            s.payBtn,
            (!selectedMethod ||
              (selectedMethod !== 'cod' && paymentOptions.find(m => m.id === selectedMethod)?.subtypes?.length > 0 && !selectedSubtype) ||
              (selectedMethod === 'upi' && selectedSubtype === 'other_upi' && !upiId.trim())
            ) && s.payBtnDisabled
          ]}
          onPress={processPayment}
          disabled={!selectedMethod || isProcessing}
        >
          <Text style={s.payBtnText}>Pay ₹{amount}</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hdrT: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },

  content: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },

  amountCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 24, alignItems: "center",
    marginBottom: 24, elevation: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  amountLabel: { fontSize: 14, color: C.textSecondary, fontWeight: "600", textTransform: 'uppercase', letterSpacing: 1 },
  amountValue: { fontSize: 36, fontWeight: "800", color: C.primary, marginVertical: 8, letterSpacing: -1 },
  divider: { width: '100%', height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
  amountDesc: { fontSize: 14, color: C.textSecondary, textAlign: "center", paddingHorizontal: 20 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 16 },

  methodCard: {
    marginBottom: 12, backgroundColor: C.card, borderRadius: 16, overflow: 'hidden',
    elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  methodBtn: { flexDirection: "row", alignItems: "center", padding: 16 },
  methodBtnActive: { backgroundColor: C.lightTeal },
  methodIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 16 },
  methodName: { flex: 1, fontSize: 16, fontWeight: "600", color: C.text },

  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.textMuted, alignItems: "center", justifyContent: "center" },
  radioCircleActive: { borderColor: C.secondary },
  selectedRb: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.secondary },

  subtypesC: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, backgroundColor: C.lightTeal, borderTopWidth: 1, borderTopColor: C.cardBorder },
  subtypeLabel: { fontSize: 13, color: C.textMuted, marginBottom: 10, fontWeight: '600' },
  subtypeBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  subtypeBtn: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
  },
  subtypeBtnActive: { borderColor: C.secondary, backgroundColor: C.lightTeal },
  subtypeBtnText: { fontSize: 13, color: C.textSecondary, marginLeft: 6, fontWeight: '500' },
  subtypeBtnTextActive: { color: C.secondary, fontWeight: '700' },

  inputC: {
    backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 24,
    elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  inputLabel: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 12 },
  inputField: {
    backgroundColor: C.lightTeal, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder,
    fontSize: 15, color: C.text, marginBottom: 12,
  },
  inputNote: { fontSize: 12, color: C.textMuted, marginBottom: 12 },
  rowInputs: { flexDirection: "row" },

  testBtn: { alignItems: 'center', padding: 10 },
  testBtnText: { color: C.secondary, fontWeight: '600', fontSize: 13 },

  infoText: { fontSize: 14, color: C.textSecondary, lineHeight: 20 },
  warningC: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 10, backgroundColor: C.warningBg, borderRadius: 8, gap: 8 },
  warningText: { color: C.warning, fontSize: 13, fontWeight: '600' },
  bankSelected: { marginTop: 10, fontSize: 14, fontWeight: '600', color: C.secondary },

  footer: {
    padding: 22, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.cardBorder,
    shadowColor: C.primary, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 10,
  },
  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.primary, paddingVertical: 18, borderRadius: 15, gap: 10,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  payBtnDisabled: { backgroundColor: C.textMuted, shadowOpacity: 0 },
  payBtnText: { color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },

  loadingC: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  loadingText: { marginTop: 16, fontSize: 16, color: C.textSecondary, fontWeight: '600' },
});

export default PaymentScreen;
