import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  primary: '#0A5F7A',
  secondary: '#1D8FAB',
  accent: '#2BB5C5',
  bg: '#F0F6F9',
  card: '#FFFFFF',
  cardBorder: '#D7E5ED',
  text: '#0A3D52',
  textSecondary: '#4A7A8C',
  textMuted: '#8AACB8',
  success: '#1A8C5B',
  successBg: '#E6F7EE',
  warning: '#D4880A',
  warningBg: '#FFF8E7',
  danger: '#C0392B',
  dangerBg: '#FDEDED',
  lightTeal: '#E0F2F7',
  gold: '#F4A623',
};

export default function CheckoutScreen({ route, navigation }) {
  const {
    cart,
    clearCart,
    getSelectedTotal,
    validateSelectedStock,
    removeSelectedItems
  } = useCart();

  const { user } = useAuth();

  const { immediateBookingItem, selectedCartItems } = route.params || {};

  const itemsToBook = immediateBookingItem
    ? [immediateBookingItem]
    : (selectedCartItems || cart.filter(item => item.selected));

  const calculateTotalAmount = () => {
    if (immediateBookingItem) {
      return (immediateBookingItem.pricePerDay || 0) * (immediateBookingItem.quantity || 1);
    } else {
      return getSelectedTotal();
    }
  };

  const [userDetails, setUserDetails] = useState({
    fullName: user?.name || "",
    phoneNumber: user?.phoneNumber || "",
    deliveryAddress: "",
    notes: "",
  });

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingStock, setValidatingStock] = useState(false);
  const isSubmittingRef = useRef(false);

  const BASE_URL = "http://10.63.72.99:5000";

  const totalAmount = calculateTotalAmount();
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const totalItems = itemsToBook.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const finalTotal = totalAmount * totalDays;


  const handleDateChange = (event, selectedDate, type) => {
    if (type === "start") {
      setShowStartPicker(false);
      if (selectedDate) {
        setStartDate(selectedDate);
        if (selectedDate > endDate) {
          setEndDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
        }
      }
    } else {
      setShowEndPicker(false);
      if (selectedDate && selectedDate > startDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const validateInputs = () => {
    if (!userDetails.fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return false;
    }
    const phoneRegex = /^[9876]\d{9}$/;
    if (!userDetails.phoneNumber.trim()) {
      Alert.alert("Error", "Please enter a phone number");
      return false;
    }
    if (!phoneRegex.test(userDetails.phoneNumber)) {
      Alert.alert("Error", "Please enter a valid mobile number (10 digits starting with 9, 7, 8, or 6)");
      return false;
    }
    if (!userDetails.deliveryAddress.trim()) {
      Alert.alert("Error", "Please enter delivery address");
      return false;
    }
    if (totalDays < 1) {
      Alert.alert("Error", "End date must be after start date");
      return false;
    }
    if (itemsToBook.length === 0) {
      Alert.alert("Error", "No items to book");
      return false;
    }

    if (!user?.userId) {
      Alert.alert("Error", "Please login to book equipment");
      return false;
    }

    return true;
  };

  const validateStockBeforeBooking = async () => {
    try {
      setValidatingStock(true);

      if (immediateBookingItem) {
        const response = await axios.get(`${BASE_URL}/equipment/${immediateBookingItem._id}`);
        if (response.data.success) {
          const equipment = response.data.equipment;
          if (equipment.stock < immediateBookingItem.quantity) {
            Alert.alert(
              "Stock Unavailable",
              `Only ${equipment.stock} unit(s) of "${equipment.equipmentName}" available`,
              [{ text: "OK" }]
            );
            return false;
          }
        }
      } else {
        const stockValidation = await validateSelectedStock();
        if (stockValidation && Array.isArray(stockValidation)) {
          const outOfStockItems = stockValidation.filter(item => !item.available);

          if (outOfStockItems.length > 0) {
            const itemNames = outOfStockItems.map(item =>
              `• ${item.itemName}: Only ${item.currentStock} available, requested ${item.requested}`
            ).join('\n');

            Alert.alert(
              "Stock Issue",
              `Some items are no longer available:\n\n${itemNames}\n\nPlease update your cart.`,
              [{ text: "OK", onPress: () => navigation.navigate("PatientCartScreen") }]
            );
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      return true;
    } finally {
      setValidatingStock(false);
    }
  };

  const handleCreateBookings = async () => {
    // Prevent double-tap / double-submission
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!validateInputs()) {
      isSubmittingRef.current = false;
      return;
    }

    setLoading(true);

    const isStockValid = await validateStockBeforeBooking();
    if (!isStockValid) {
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    try {
      const fixedItems = itemsToBook.map(item => {
        const fixedItem = { ...item };

        if (item.providerId && typeof item.providerId === 'object') {
          fixedItem.providerId = item.providerId._id;
          if (!fixedItem.providerName && item.providerId.name) {
            fixedItem.providerName = item.providerId.name;
          }
        }

        return fixedItem;
      });


      const bookingPromises = fixedItems.map(async (item) => {
        const bookingData = {
          patientId: user.userId,
          patientName: userDetails.fullName || user?.name,
          equipmentId: item._id,
          equipmentName: item.equipmentName,
          providerId: item.providerId,
          providerName: item.providerName,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          pricePerDay: item.pricePerDay,
          quantity: item.quantity || 1,
          deliveryAddress: userDetails.deliveryAddress,
          contactPhone: userDetails.phoneNumber,
          notes: userDetails.notes || "",
        };


        try {
          const response = await axios.post(`${BASE_URL}/booking/create`, bookingData);
          return response.data;
        } catch (error) {
          console.error("❌ Booking failed for", item.equipmentName, ":", error.response?.data || error.message);
          throw error;
        }
      });

      const results = await Promise.all(bookingPromises);

      const failedResults = results.filter(r => !r?.success);
      if (failedResults.length > 0) {
        throw new Error(failedResults[0].message || "Booking failed");
      }


      if (immediateBookingItem) {
        // For immediate booking, nothing to clear from cart
      } else {
        removeSelectedItems();
      }

      const allBookingIds = results
        .filter(r => r?.bookingId)
        .map(r => r.bookingId);



      if (allBookingIds.length > 0) {
        navigation.navigate("PaymentScreen", {
          type: "booking",
          amount: finalTotal,
          bookingId: allBookingIds[0],
          bookingIds: allBookingIds,
          bookingData: {
            items: fixedItems,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalDays: totalDays
          }
        });
      } else {
        Alert.alert("Success", "Bookings created. Please complete payment in your bookings section.");
        navigation.navigate("PatientBookingsScreen", {
          patientId: user.userId,
          refresh: true
        });
      }

    } catch (error) {
      console.error("❌ Booking error:", error);

      let errorMessage = "Failed to create booking. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes("Only") && error.message.includes("available")) {
        errorMessage = error.message;
      }

      Alert.alert("Booking Failed", errorMessage);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const renderOrderSummary = () => {
    const isImmediateBooking = !!immediateBookingItem;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isImmediateBooking ? "Booking Summary" : `Order Summary (${totalItems} items)`}
        </Text>

        {itemsToBook.map((item, index) => (
          <View key={index} style={styles.cartItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.equipmentName}</Text>
              <Text style={styles.itemQuantity}>Quantity: {item.quantity || 1}</Text>
              <Text style={styles.itemProvider}>Provider: {item.providerName}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.itemPriceSingle}>₹{item.pricePerDay}/day</Text>
              <Text style={styles.itemPrice}>
                Total: ₹{(item.pricePerDay * (item.quantity || 1)).toFixed(2)}/day
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Daily Total:</Text>
          <Text style={styles.dailyAmount}>₹{totalAmount.toFixed(2)}/day</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total ({totalDays} days):</Text>
          <Text style={styles.totalAmount}>₹{finalTotal.toFixed(2)}</Text>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentInfoText}>
            💳 Payment will be required after booking creation
          </Text>
          <Text style={styles.paymentInfoSubtext}>
            Equipment will be reserved once payment is completed
          </Text>
        </View>

        {isImmediateBooking && (
          <Text style={styles.noteText}>
            Note: This is an immediate booking. Item will not be added to cart.
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Gradient Header */}
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {renderOrderSummary()}

        {/* Rental Period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental Period</Text>

          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Start Date:</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={C.textSecondary} style={{ marginRight: 8 }} />
              <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>End Date:</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={C.textSecondary} style={{ marginRight: 8 }} />
              <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.daysText}>Total rental days: {totalDays}</Text>
        </View>

        {/* User Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={C.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={userDetails.fullName}
              onChangeText={(text) => setUserDetails({ ...userDetails, fullName: text })}
              placeholderTextColor={C.textMuted}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={C.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (10 digits)"
              value={userDetails.phoneNumber}
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9]/g, '').slice(0, 10);
                setUserDetails({ ...userDetails, phoneNumber: numericText });
              }}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor={C.textMuted}
            />
          </View>

          <View style={[styles.inputContainer, { alignItems: 'flex-start' }]}>
            <Ionicons name="location-outline" size={20} color={C.textMuted} style={[styles.inputIcon, { marginTop: 12 }]} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Delivery Address"
              value={userDetails.deliveryAddress}
              onChangeText={(text) => setUserDetails({ ...userDetails, deliveryAddress: text })}
              multiline
              numberOfLines={3}
              placeholderTextColor={C.textMuted}
            />
          </View>

          <View style={[styles.inputContainer, { alignItems: 'flex-start' }]}>
            <Ionicons name="document-text-outline" size={20} color={C.textMuted} style={[styles.inputIcon, { marginTop: 12 }]} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional Notes (optional)"
              value={userDetails.notes}
              onChangeText={(text) => setUserDetails({ ...userDetails, notes: text })}
              multiline
              numberOfLines={2}
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading || validatingStock}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, (loading || validatingStock) && styles.disabledButton]}
            onPress={handleCreateBookings}
            disabled={loading || validatingStock}
          >
            {loading || validatingStock ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>Create Booking</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Payment Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Payment Process:</Text>
          <Text style={styles.infoText}>1. Create booking first (equipment reserved)</Text>
          <Text style={styles.infoText}>2. Complete payment to confirm booking</Text>
        </View>

        {/* Stock Validation Status */}
        {validatingStock && (
          <View style={styles.validationContainer}>
            <ActivityIndicator size="small" color={C.secondary} />
            <Text style={styles.validationText}>Checking stock availability...</Text>
          </View>
        )}

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => handleDateChange(event, date, "start")}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            minimumDate={startDate}
            onChange={(event, date) => handleDateChange(event, date, "end")}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: C.bg },

  headerGradient: {
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  section: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    elevation: 3,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    marginBottom: 16,
    letterSpacing: 0.2,
  },

  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  itemName: {
    fontSize: 16,
    color: C.text,
    fontWeight: "600",
  },
  itemQuantity: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 4,
  },
  itemProvider: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  itemPriceSingle: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: C.success,
  },
  dailyAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 15,
    color: C.textSecondary,
    fontWeight: "500",
  },
  dateButton: {
    flexDirection: 'row',
    backgroundColor: C.lightTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: C.text,
    fontWeight: "600",
  },
  daysText: {
    fontSize: 16,
    color: C.secondary,
    fontWeight: "600",
    marginTop: 8,
    textAlign: 'center',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: C.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  actionButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: C.dangerBg,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#F5C6C6',
  },
  cancelButtonText: {
    color: C.danger,
    fontSize: 16,
    fontWeight: "700",
  },
  confirmButton: {
    flex: 2,
    backgroundColor: C.primary,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: C.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  validationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: C.lightTeal,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  validationText: {
    marginLeft: 8,
    fontSize: 13,
    color: C.primary,
    fontWeight: "500",
  },

  noteText: {
    fontSize: 13,
    color: C.textSecondary,
    fontStyle: "italic",
    marginTop: 12,
    padding: 10,
    backgroundColor: C.lightTeal,
    borderRadius: 10,
  },

  paymentInfo: {
    backgroundColor: C.successBg,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C8E6D4',
  },
  paymentInfoText: {
    fontSize: 14,
    color: C.success,
    fontWeight: "700",
  },
  paymentInfoSubtext: {
    fontSize: 12,
    color: '#157A4E',
    marginTop: 4,
  },

  infoSection: {
    backgroundColor: C.warningBg,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE8B3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.warning,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#B37200',
    marginBottom: 6,
    fontWeight: "500",
  },
});
