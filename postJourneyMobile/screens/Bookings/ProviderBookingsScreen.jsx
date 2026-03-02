import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  StatusBar,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
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

export default function ProviderBookingsScreen({ route, navigation }) {
  const { providerId } = route.params;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BASE_URL = "http://192.168.172.72:5000";

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/booking/provider/${providerId}`);
      if (res.data.success) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      Alert.alert("Error", "Failed to load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, [providerId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const res = await axios.put(`${BASE_URL}/booking/update-status/${bookingId}`, {
        status
      });

      if (res.data.success) {
        Alert.alert("Success", `Booking ${status} successfully`);
        fetchBookings();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update booking status");
    }
  };

  const updatePaymentStatus = async (bookingId, paymentStatus) => {
    try {
      const res = await axios.put(`${BASE_URL}/booking/update-payment-status/${bookingId}`, {
        paymentStatus
      });

      if (res.data.success) {
        Alert.alert("Success", `Payment marked as ${paymentStatus}`);
        fetchBookings();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update payment status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return C.success;
      case "pending": return C.warning;
      case "in-progress": return C.secondary;
      case "completed": return '#8b5cf6';
      case "cancelled": return C.danger;
      default: return C.textMuted;
    }
  };

  const getPaymentStatusColor = (paymentStatus) => {
    switch (paymentStatus) {
      case "paid": return C.success;
      case "pending": return C.warning;
      case "refunded": return '#8b5cf6';
      default: return C.textMuted;
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ProviderBookingDetailsScreen", { booking: item })}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.equipmentName}>{item.equipmentName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {/* Payment Status Row */}
      <View style={styles.paymentRow}>
        <View style={styles.paymentMethodBadge}>
          <Text style={styles.paymentMethodText}>
            {item.paymentMethod === "cod" ? "💵 COD" : "💳 Online"}
          </Text>
        </View>
        <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(item.paymentStatus) }]}>
          <Text style={styles.paymentStatusText}>
            {item.paymentStatus === "paid" ? "✓ Paid" : item.paymentStatus === "pending" ? "⏳ Pending" : item.paymentStatus}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={16} color={C.textSecondary} style={styles.icon} />
        <Text style={styles.patient}>Patient: {item.patientName}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="call-outline" size={16} color={C.textSecondary} style={styles.icon} />
        <Text style={styles.contact}>Phone: {item.contactPhone}</Text>
      </View>

      <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
        <Ionicons name="location-outline" size={16} color={C.textSecondary} style={[styles.icon, { marginTop: 2 }]} />
        <Text style={styles.address}>Address: {item.deliveryAddress}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.datesContainer}>
        <View style={styles.dateInfo}>
          <Ionicons name="calendar-outline" size={16} color={C.textSecondary} style={styles.icon} />
          <Text style={styles.dateText}>
            {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.amount}>₹ {item.totalAmount}</Text>
      </View>

      {/* Action Buttons based on status */}
      <View style={styles.actionButtons}>
        {item.status === "pending" && (
          <>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => updateBookingStatus(item._id, "confirmed")}
            >
              <Text style={styles.btnText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => updateBookingStatus(item._id, "cancelled")}
            >
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === "confirmed" && (
          <TouchableOpacity
            style={styles.inProgressBtn}
            onPress={() => updateBookingStatus(item._id, "in-progress")}
          >
            <Text style={styles.btnText}>Mark as In Progress</Text>
          </TouchableOpacity>
        )}

        {item.status === "in-progress" && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => updateBookingStatus(item._id, "completed")}
          >
            <Text style={styles.btnText}>Mark Complete</Text>
          </TouchableOpacity>
        )}

        {/* Mark as Paid button for COD orders after completion */}
        {item.status === "completed" &&
          item.paymentMethod === "cod" &&
          item.paymentStatus === "pending" && (
            <TouchableOpacity
              style={styles.paidBtn}
              onPress={() => {
                Alert.alert(
                  "Confirm Payment",
                  "Have you received the cash payment for this order?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Yes, Mark as Paid", onPress: () => updatePaymentStatus(item._id, "paid") }
                  ]
                );
              }}
            >
              <Text style={styles.btnText}>💰 Mark as Paid</Text>
            </TouchableOpacity>
          )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
          <Text style={styles.headerTitle}>Booking Requests</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Content */}
      {bookings.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar-outline" size={48} color={C.textMuted} />
          </View>
          <Text style={styles.emptyText}>No booking requests yet</Text>
          <Text style={styles.emptySubtext}>New bookings will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.secondary]}
              tintColor={C.secondary}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

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

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    elevation: 3,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  equipmentName: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: 'capitalize',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 8,
    width: 20,
  },
  patient: {
    fontSize: 14,
    color: C.text,
    fontWeight: "500",
  },
  contact: {
    fontSize: 14,
    color: C.text,
  },
  address: {
    fontSize: 14,
    color: C.textSecondary,
    flex: 1,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginVertical: 12,
  },

  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    marginBottom: 16,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: "500",
  },
  amount: {
    fontSize: 18,
    fontWeight: "800",
    color: C.success,
  },

  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  confirmBtn: {
    backgroundColor: C.success,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  rejectBtn: {
    backgroundColor: C.danger,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: C.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  inProgressBtn: {
    backgroundColor: C.secondary,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  completeBtn: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  paidBtn: {
    backgroundColor: C.success,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  paymentMethodBadge: {
    backgroundColor: C.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6D4',
  },
  paymentMethodText: {
    fontSize: 12,
    color: C.success,
    fontWeight: "600",
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  paymentStatusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.lightTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: C.textSecondary,
  },
});
