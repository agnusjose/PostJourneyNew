// screens/Bookings/PatientEquipmentList.jsx
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Image, TouchableOpacity,
  Alert, TextInput, RefreshControl, ScrollView, SafeAreaView, StatusBar,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import axios from "axios";
import { useCart } from "../../context/CartContext";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', accent: '#2BB5C5',
  bg: '#F0F6F9', card: '#FFFFFF', cardBorder: '#D7E5ED',
  text: '#0A3D52', textSecondary: '#4A7A8C', textMuted: '#8AACB8',
  success: '#1A8C5B', successBg: '#E6F7EE', danger: '#C0392B',
  lightTeal: '#E0F2F7',
};

export default function PatientEquipmentList() {
  const navigation = useNavigation();
  const { getCartCount } = useCart();
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const BASE_URL = "http://10.63.72.99:5000";

  const categories = [
    { id: "all", label: "All" },
    { id: "mobility", label: "Mobility" },
    { id: "respiratory", label: "Respiratory" },
    { id: "daily-living", label: "Daily" },
    { id: "therapeutic", label: "Therapeutic " },
    { id: "beds", label: "Beds" },
    { id: "monitoring", label: "Monitoring" },
    { id: "other", label: "Others" },
  ];

  useEffect(() => { fetchEquipment(); }, []);
  useEffect(() => { filterEquipment(); }, [searchQuery, selectedCategory, equipment]);

  const fetchEquipment = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/equipment/all`);
      if (res.data.success) { setEquipment(res.data.equipment); setFilteredEquipment(res.data.equipment); }
    } catch (error) { Alert.alert("Error", "Failed to load equipment"); }
  };

  const filterEquipment = () => {
    let filtered = equipment;
    if (searchQuery) { filtered = filtered.filter(item => item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase())); }
    if (selectedCategory !== "all") { filtered = filtered.filter(item => item.category === selectedCategory); }
    setFilteredEquipment(filtered);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("EquipmentDetailScreen", { equipmentId: item._id })}
    >
      <Image
        source={{ uri: item.imageUrl ? `${BASE_URL}${item.imageUrl}` : "https://via.placeholder.com/150" }}
        style={s.image}
      />
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{item.equipmentName}</Text>
        <View style={s.priceContainer}>
          <Text style={s.price}>₹{item.pricePerDay}</Text>
          <Text style={s.priceUnit}>/day</Text>
        </View>

        <View style={s.statusRow}>
          <View style={[s.statusDot, { backgroundColor: item.stock > 0 ? C.success : C.danger }]} />
          <Text style={[s.inStockText, { color: item.stock > 0 ? C.success : C.danger }]}>
            {item.stock > 0 ? "In Stock" : "Out of Stock"}
          </Text>
        </View>

        <TouchableOpacity
          style={s.detailsBtn}
          onPress={() => navigation.navigate("EquipmentDetailScreen", { equipmentId: item._id })}
        >
          <Text style={s.detailsBtnText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={C.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Gradient Header */}
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
        <View style={s.header}>
          <TouchableOpacity
            style={s.backButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("ServiceBookingScreen")}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Marketplace</Text>
          <TouchableOpacity
            style={s.bookingsBadge}
            onPress={() => navigation.navigate("PatientBookingsScreen")}
          >
            <Ionicons name="calendar" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={s.bookingsText}>Bookings</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={s.body}>
        {/* Search */}
        <View style={s.searchContainer}>
          <Ionicons name="search" size={18} color={C.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search equipment..."
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories */}
        <View style={{ marginBottom: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[s.categoryBtn, selectedCategory === cat.id && s.categoryBtnActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[s.categoryBtnText, selectedCategory === cat.id && s.categoryBtnTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredEquipment}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEquipment().finally(() => setRefreshing(false)); }} colors={[C.secondary]} />}
        />
      </View>

      {/* Floating Cart */}
      <TouchableOpacity style={s.cartFloating} onPress={() => navigation.navigate("PatientCart")}>
        <LinearGradient colors={[C.primary, C.secondary]} style={s.cartGradient}>
          <View style={s.cartBadge}>
            <Text style={s.cartBadgeText}>{getCartCount()}</Text>
          </View>
          <Ionicons name="cart" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  bookingsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  bookingsText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  body: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },

  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 15, paddingHorizontal: 15, height: 50, marginBottom: 20, borderWidth: 1, borderColor: C.cardBorder, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, color: C.text, fontWeight: '500' },

  categoryBtn: { paddingHorizontal: 18, paddingVertical: 8, backgroundColor: C.card, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: C.cardBorder },
  categoryBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  categoryBtnText: { color: C.textSecondary, fontWeight: '600', fontSize: 13 },
  categoryBtnTextActive: { color: '#fff' },

  card: { flexDirection: "row", backgroundColor: C.card, borderRadius: 20, padding: 15, marginBottom: 16, borderWidth: 1, borderColor: C.cardBorder, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  image: { width: 90, height: 90, borderRadius: 15, backgroundColor: C.lightTeal },
  info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 4 },
  priceContainer: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  price: { fontSize: 18, fontWeight: "800", color: C.text },
  priceUnit: { fontSize: 12, color: C.textSecondary, marginLeft: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  inStockText: { fontSize: 12, fontWeight: '600' },
  detailsBtn: { flexDirection: 'row', alignItems: 'center' },
  detailsBtnText: { fontSize: 13, fontWeight: "700", color: C.secondary, marginRight: 2 },

  cartFloating: { position: "absolute", bottom: 30, right: 22, elevation: 8, shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  cartGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", overflow: 'hidden' },
  cartBadge: { position: "absolute", top: 0, right: 0, backgroundColor: C.danger, minWidth: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", zIndex: 10, paddingHorizontal: 4, borderWidth: 2, borderColor: C.bg },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
