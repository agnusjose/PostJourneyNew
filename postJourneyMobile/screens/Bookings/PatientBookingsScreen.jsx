import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Alert, StatusBar,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
  cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
  textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
  warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B',
  lightTeal: '#E0F2F7',
};

export default function PatientBookingsScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BASE_URL = "http://10.63.72.99:5000";

  const fetchBookings = async () => {
    try {
      console.log("📡 Fetching bookings for user:", user?.userId);
      const response = await axios.get(`${BASE_URL}/booking/patient/${user?.userId}`);

      if (response.data.success) {
        setBookings(response.data.bookings || []);
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch bookings");
      }
    } catch (error) {
      console.error("❌ Fetch bookings error:", error);
      Alert.alert("Error", "Failed to load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.userId) {
      fetchBookings();
    }
  }, [user?.userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const renderBookingItem = ({ item }) => (
    <TouchableOpacity
      style={s.bookingCard}
      onPress={() => navigation.navigate("OrderDetailsScreen", {
        booking: item
      })}
      activeOpacity={0.9}
    >
      <View style={s.bookingHeader}>
        <Text style={s.equipmentName}>
          {item.equipmentName || item.equipmentId?.equipmentName || "Equipment"}
        </Text>
        <View style={[
          s.statusBadge,
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Text style={s.statusText}>
            {item.status?.toUpperCase() || "PENDING"}
          </Text>
        </View>
      </View>

      <Text style={s.providerText}>
        Provider: {item.providerName || "N/A"}
      </Text>

      <View style={s.divider} />

      <View style={s.datesContainer}>
        <View style={s.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={C.textSecondary} />
          <Text style={s.dateText}>
            {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
          </Text>
        </View>
        <Text style={s.daysText}>{item.totalDays || 0} days</Text>
      </View>

      <View style={s.bookingFooter}>
        <Text style={s.amountLabel}>Total</Text>
        <Text style={s.amountText}>
          ₹{item.totalAmount?.toFixed(2) || "0.00"}
        </Text>
      </View>

      <View style={s.paymentRow}>
        <Ionicons name={item.paymentStatus === 'paid' ? "checkmark-circle" : "time-outline"} size={14} color={item.paymentStatus === 'paid' ? C.success : C.warning} />
        <Text style={[s.paymentStatus, { color: item.paymentStatus === 'paid' ? C.success : C.warning }]}>
          Payment: {item.paymentStatus || "pending"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return C.success;
      case "in-progress": return C.secondary;
      case "completed": return '#8b5cf6';
      case "cancelled": return C.danger;
      default: return C.warning;
    }
  };

  if (loading) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
          <View style={s.hdr}>
            <View style={{ width: 40 }} />
            <Text style={s.hdrT}>My Bookings</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={C.secondary} />
          <Text style={s.loadingText}>Loading your bookings...</Text>
        </View>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
          <View style={s.hdr}>
            <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={s.hdrT}>My Bookings</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={s.centerContainer}>
          <Ionicons name="calendar-outline" size={80} color={C.textMuted} />
          <Text style={s.emptyText}>No bookings found</Text>
          <Text style={s.emptySubtext}>
            You haven't booked any equipment yet
          </Text>
          <TouchableOpacity
            style={s.browseButton}
            onPress={() => navigation.navigate("PatientEquipmentList")}
          >
            <Text style={s.browseButtonText}>Browse Equipment</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={s.hdrT}>My Bookings</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.secondary]}
          />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  hdr: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hdrT: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },

  listContainer: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 40,
  },

  bookingCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },

  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },

  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  providerText: {
    fontSize: 14,
    color: C.textSecondary,
    marginBottom: 12,
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginBottom: 12,
  },

  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dateText: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: "500",
  },

  daysText: {
    fontSize: 13,
    color: C.secondary,
    fontWeight: "600",
    backgroundColor: C.lightTeal,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  amountLabel: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: "500",
  },

  amountText: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
  },

  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },

  paymentStatus: {
    fontSize: 13,
    fontWeight: "600",
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: C.textSecondary,
    fontWeight: "500",
  },

  emptyText: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    marginTop: 20,
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 16,
    color: C.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },

  browseButton: {
    backgroundColor: C.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 15,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  browseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
