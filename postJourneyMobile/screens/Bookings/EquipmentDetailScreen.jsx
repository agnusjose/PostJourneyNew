// EquipmentDetailScreen.jsx
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  Alert, Modal, Dimensions, ActivityIndicator, StatusBar,
} from "react-native";
import { useCart } from "../../context/CartContext";
import axios from "axios";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', accent: '#2BB5C5',
  bg: '#F0F6F9', card: '#FFFFFF', cardBorder: '#D7E5ED',
  text: '#0A3D52', textSecondary: '#4A7A8C', textMuted: '#8AACB8',
  success: '#1A8C5B', successBg: '#E6F7EE', danger: '#C0392B',
  lightTeal: '#E0F2F7',
};

export default function EquipmentDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { equipmentId } = route.params;
  const { addToCart, prepareForImmediateBooking, isItemInCart, getCartItemQuantity, loading: cartLoading } = useCart();

  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showFullImage, setShowFullImage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const BASE_URL = "http://172.16.230.150:5000";

  useEffect(() => { fetchEquipmentDetails(); fetchReviews(); }, []);
  useEffect(() => { if (equipment) { const cartQty = getCartItemQuantity(equipment._id); const maxAvailable = Math.max(0, equipment.stock - cartQty); setQuantity(Math.min(1, maxAvailable)); } }, [equipment]);

  const fetchEquipmentDetails = async () => {
    try { const res = await axios.get(`${BASE_URL}/equipment/${equipmentId}`); if (res.data.success) setEquipment(res.data.equipment); }
    catch (error) { Alert.alert("Error", "Failed to load equipment details"); } finally { setLoading(false); }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/equipment/${equipmentId}/reviews`);
      if (res.data.success) { setReviews(res.data.reviews || []); setAverageRating(res.data.averageRating || 0); setTotalReviews(res.data.totalReviews || 0); }
    } catch (error) { console.error("Failed to load reviews:", error); }
  };

  const handleAddToCart = async () => {
    if (!equipment || equipment.stock === 0) { Alert.alert("Out of Stock", "This equipment is currently unavailable"); return; }
    const cartQty = getCartItemQuantity(equipment._id); const available = equipment.stock - cartQty;
    if (quantity > available) { Alert.alert("Insufficient Stock", `Only ${available} unit(s) available`); return; }
    setIsProcessing(true);
    const cartItem = { _id: equipment._id, equipmentName: equipment.equipmentName, pricePerDay: equipment.pricePerDay, imageUrl: equipment.imageUrl, providerName: equipment.providerName, providerId: equipment.providerId, category: equipment.category, quantity: quantity };
    const result = await addToCart(cartItem);
    if (result.success) { Alert.alert("Added to Cart", `${quantity}x ${equipment.equipmentName} added to cart`, [{ text: "Continue Shopping", style: "cancel" }, { text: "View Cart", onPress: () => navigation.navigate("PatientCart") }]); }
    else { Alert.alert("Cannot Add to Cart", result.message || "Failed to add to cart"); }
    setIsProcessing(false);
  };

  const handleBookNow = async () => {
    if (!equipment || equipment.stock === 0) { Alert.alert("Out of Stock", "This equipment is currently unavailable"); return; }
    const cartQty = getCartItemQuantity(equipment._id); const available = equipment.stock - cartQty;
    if (quantity > available) { Alert.alert("Insufficient Stock", `Only ${available} unit(s) available`); return; }
    setIsProcessing(true);
    const result = await prepareForImmediateBooking(equipment._id, quantity);
    if (result.success) { navigation.navigate("CheckoutScreen", { immediateBookingItem: result.bookingItem }); }
    else { Alert.alert("Cannot Proceed", result.message || "Failed to proceed to booking"); }
    setIsProcessing(false);
  };

  const handleIncreaseQuantity = () => {
    if (!equipment) return; const cartQty = getCartItemQuantity(equipment._id); const maxAvailable = equipment.stock - cartQty;
    if (quantity < maxAvailable) { setQuantity(quantity + 1); } else { Alert.alert("Maximum Quantity", `Only ${maxAvailable} unit(s) available (${cartQty} already in cart)`); }
  };

  const handleDecreaseQuantity = () => { if (quantity > 1) setQuantity(quantity - 1); };

  const renderStars = (rating) => {
    const stars = []; const fullStars = Math.floor(rating); const hasHalfStar = rating % 1 !== 0;
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) stars.push(<Ionicons key={i} name="star" size={16} color="#fbbf24" />);
      else if (i === fullStars + 1 && hasHalfStar) stars.push(<Ionicons key={i} name="star-half" size={16} color="#fbbf24" />);
      else stars.push(<Ionicons key={i} name="star-outline" size={16} color={C.textMuted} />);
    }
    return stars;
  };

  if (loading) {
    return (<View style={s.root}><StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}><View style={s.hdr}><View style={{ width: 40 }} /><Text style={s.hdrT}>Equipment Details</Text><View style={{ width: 40 }} /></View></LinearGradient>
      <View style={s.centerC}><ActivityIndicator size="large" color={C.secondary} /><Text style={s.loadingText}>Loading...</Text></View></View>);
  }

  if (!equipment) {
    return (<View style={s.root}><StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}><View style={s.hdr}><TouchableOpacity style={s.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity><Text style={s.hdrT}>Equipment Details</Text><View style={{ width: 40 }} /></View></LinearGradient>
      <View style={s.centerC}><Text style={s.errorText}>Equipment not found</Text><TouchableOpacity style={s.goBackBtn} onPress={() => navigation.goBack()}><Text style={s.goBackBtnText}>Go Back</Text></TouchableOpacity></View></View>);
  }

  const imageUrl = equipment.imageUrl ? `${BASE_URL}${equipment.imageUrl}` : "https://via.placeholder.com/300";
  const categoryColors = { "mobility": C.secondary, "respiratory": "#10b981", "daily-living": "#8b5cf6", "therapeutic": "#f59e0b", "monitoring": "#ef4444", "other": C.textSecondary };
  const cartQty = getCartItemQuantity(equipment._id);
  const availableForAdd = Math.max(0, equipment.stock - cartQty);
  const canAdd = availableForAdd > 0 && quantity <= availableForAdd;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
        <View style={s.hdr}>
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
          <Text style={s.hdrT}>Equipment Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={s.scrollC} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => setShowFullImage(true)}><Image source={{ uri: imageUrl }} style={s.mainImage} resizeMode="contain" /></TouchableOpacity>

        <View style={s.infoC}>
          <View style={[s.categoryBadge, { backgroundColor: categoryColors[equipment.category] || C.textSecondary }]}><Text style={s.categoryText}>{equipment.category?.replace("-", " ").toUpperCase() || "OTHER"}</Text></View>
          <Text style={s.eqName}>{equipment.equipmentName}</Text>

          <View style={s.providerC}><Ionicons name="business" size={16} color={C.textSecondary} /><Text style={s.providerText}>Sold by: {equipment.providerName}</Text></View>

          <View style={s.ratingC}>
            <View style={s.ratingStars}>{renderStars(averageRating)}<Text style={s.ratingValue}>{averageRating.toFixed(1)}</Text></View>
            <Text style={s.ratingCount}>({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</Text>
          </View>

          <View style={s.priceC}><Text style={s.price}>₹ {equipment.pricePerDay}</Text><Text style={s.priceUnit}> / day</Text></View>

          <View style={s.stockC}>
            {equipment.stock > 0 ? (<><Ionicons name="checkmark-circle" size={18} color={C.success} /><Text style={s.inStock}>In Stock ({equipment.stock})</Text></>) :
              (<><Ionicons name="close-circle" size={18} color={C.danger} /><Text style={s.outOfStock}>Out of Stock</Text></>)}
          </View>

          {equipment.stock > 0 && availableForAdd > 0 && (
            <View style={s.qtyC}>
              <Text style={s.qtyLabel}>Quantity:</Text>
              <View style={s.qtyCtrls}>
                <TouchableOpacity style={[s.qtyBtn, quantity <= 1 && s.qtyBtnDisabled]} onPress={handleDecreaseQuantity} disabled={quantity <= 1}><Ionicons name="remove" size={20} color={quantity <= 1 ? C.textMuted : C.text} /></TouchableOpacity>
                <Text style={s.qtyText}>{quantity}</Text>
                <TouchableOpacity style={[s.qtyBtn, quantity >= availableForAdd && s.qtyBtnDisabled]} onPress={handleIncreaseQuantity} disabled={quantity >= availableForAdd}><Ionicons name="add" size={20} color={quantity >= availableForAdd ? C.textMuted : C.text} /></TouchableOpacity>
              </View>
              <Text style={s.qtyHint}>Max: {availableForAdd} unit(s) available. {cartQty > 0 && ` (${cartQty} in cart)`}</Text>
            </View>)}

          <View style={s.descC}><Text style={s.sectionTitle}>Description</Text><Text style={s.desc}>{equipment.description}</Text></View>

          <View style={s.specsC}><Text style={s.sectionTitle}>Specifications</Text>
            <View style={s.specRow}><Text style={s.specLabel}>Category:</Text><Text style={s.specValue}>{equipment.category?.replace("-", " ") || "Other"}</Text></View>
            <View style={s.specRow}><Text style={s.specLabel}>Daily Price:</Text><Text style={s.specValue}>₹ {equipment.pricePerDay}</Text></View>
            <View style={s.specRow}><Text style={s.specLabel}>Available Stock:</Text><Text style={s.specValue}>{equipment.stock} units</Text></View>
            <View style={s.specRow}><Text style={s.specLabel}>Condition:</Text><Text style={s.specValue}>Sanitized & Certified</Text></View>
          </View>

          <View style={s.actionBtns}>
            <TouchableOpacity style={[s.addCartBtn, (!canAdd || isProcessing || cartLoading) && s.disabledBtn]} onPress={handleAddToCart} disabled={!canAdd || isProcessing || cartLoading}>
              {isProcessing || cartLoading ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="cart" size={20} color="#fff" /><Text style={s.addCartText}>{cartQty > 0 ? 'Add More' : 'Add to Cart'}</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.bookNowBtn, (!canAdd || isProcessing || cartLoading) && s.disabledBtn]} onPress={handleBookNow} disabled={!canAdd || isProcessing || cartLoading}>
              {isProcessing || cartLoading ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="flash" size={20} color="#fff" /><Text style={s.bookNowText}>Book Now</Text></>}
            </TouchableOpacity>
          </View>

          <View style={s.deliveryInfo}><Ionicons name="time" size={18} color={C.secondary} /><Text style={s.deliveryText}>Same-day delivery available in metro cities</Text></View>
          <View style={s.deliveryInfo}><Ionicons name="shield-checkmark" size={18} color={C.success} /><Text style={s.deliveryText}>Fully sanitized and certified equipment</Text></View>

          {reviews.length > 0 && (
            <View style={s.reviewsSection}><Text style={s.sectionTitle}>Customer Reviews ({totalReviews})</Text>
              {reviews.slice(0, 5).map((review, index) => (
                <View key={index} style={s.reviewCard}>
                  <View style={s.reviewHeader}><View style={s.reviewerInfo}><Ionicons name="person-circle" size={32} color={C.textMuted} />
                    <View><Text style={s.reviewerName}>{review.userName}</Text><View style={s.reviewStarsRow}>{Array.from({ length: 5 }, (_, i) => (<Ionicons key={i} name={i < review.rating ? "star" : "star-outline"} size={14} color="#fbbf24" />))}</View></View></View>
                    <Text style={s.reviewDate}>{new Date(review.date).toLocaleDateString()}</Text></View>
                  {review.comment && <Text style={s.reviewComment}>"{review.comment}"</Text>}
                </View>))}
              {reviews.length > 5 && <Text style={s.moreReviewsText}>+{reviews.length - 5} more reviews</Text>}
            </View>)}
        </View>

        <Modal visible={showFullImage} transparent={true} animationType="fade">
          <View style={s.fullImgModal}><TouchableOpacity style={s.closeFullImg} onPress={() => setShowFullImage(false)}><Ionicons name="close" size={30} color="#fff" /></TouchableOpacity>
            <Image source={{ uri: imageUrl }} style={s.fullImg} resizeMode="contain" /></View>
        </Modal>
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
  scrollC: { flex: 1 },
  centerC: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: C.textSecondary, fontWeight: "500" },
  errorText: { fontSize: 18, color: C.text, fontWeight: "700", marginBottom: 20 },
  goBackBtn: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  goBackBtnText: { color: "#fff", fontWeight: "600" },
  mainImage: { width: "100%", height: 300, backgroundColor: C.lightTeal },
  infoC: { padding: 22, backgroundColor: C.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, shadowColor: C.primary, shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, minHeight: 500 },
  categoryBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  categoryText: { color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  eqName: { fontSize: 26, fontWeight: "800", color: C.text, marginBottom: 8, letterSpacing: -0.5 },
  providerC: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  providerText: { marginLeft: 6, fontSize: 14, color: C.textSecondary, fontWeight: "500" },
  ratingC: { flexDirection: "row", alignItems: "center", marginBottom: 20, backgroundColor: C.lightTeal, padding: 10, borderRadius: 12, alignSelf: 'flex-start' },
  ratingStars: { flexDirection: "row", alignItems: "center" },
  ratingValue: { fontSize: 16, fontWeight: "700", color: C.text, marginLeft: 6 },
  ratingCount: { fontSize: 14, color: C.textSecondary, marginLeft: 8 },
  priceC: { flexDirection: "row", alignItems: "baseline", marginBottom: 20 },
  price: { fontSize: 32, fontWeight: "800", color: C.text },
  priceUnit: { fontSize: 16, color: C.textSecondary, marginLeft: 4, fontWeight: "500" },
  stockC: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  inStock: { marginLeft: 6, fontSize: 14, color: C.success, fontWeight: "600" },
  outOfStock: { marginLeft: 6, fontSize: 14, color: C.danger, fontWeight: "600" },
  qtyC: { marginBottom: 24, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.cardBorder },
  qtyLabel: { fontSize: 16, fontWeight: "600", color: C.text, marginBottom: 12 },
  qtyCtrls: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.lightTeal, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  qtyBtnDisabled: { backgroundColor: C.bg, borderColor: C.cardBorder, opacity: 0.5 },
  qtyText: { fontSize: 20, fontWeight: "700", marginHorizontal: 20, minWidth: 30, textAlign: "center", color: C.text },
  qtyHint: { fontSize: 12, color: C.textSecondary, textAlign: "center", marginTop: 8 },
  descC: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 12, letterSpacing: 0.2 },
  desc: { fontSize: 15, lineHeight: 24, color: C.textSecondary },
  specsC: { marginBottom: 24, backgroundColor: C.lightTeal, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder },
  specRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  specLabel: { fontSize: 14, color: C.textSecondary, fontWeight: "500" },
  specValue: { fontSize: 14, color: C.text, fontWeight: "600" },
  actionBtns: { flexDirection: "row", gap: 16, marginBottom: 24 },
  addCartBtn: { flex: 1, flexDirection: "row", backgroundColor: C.primary, paddingVertical: 16, borderRadius: 15, alignItems: "center", justifyContent: "center", gap: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  bookNowBtn: { flex: 1, flexDirection: "row", backgroundColor: C.success, paddingVertical: 16, borderRadius: 15, alignItems: "center", justifyContent: "center", gap: 8, shadowColor: C.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  disabledBtn: { backgroundColor: C.textMuted, shadowOpacity: 0, elevation: 0 },
  addCartText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bookNowText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  deliveryInfo: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  deliveryText: { marginLeft: 10, fontSize: 14, color: C.textSecondary, fontWeight: "500" },
  reviewsSection: { marginTop: 30, marginBottom: 20 },
  reviewCard: { backgroundColor: C.card, padding: 16, borderRadius: 15, marginBottom: 16, borderWidth: 1, borderColor: C.cardBorder, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  reviewerInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewerName: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  reviewStarsRow: { flexDirection: "row" },
  reviewDate: { fontSize: 12, color: C.textMuted },
  reviewComment: { fontSize: 14, color: C.textSecondary, fontStyle: "italic", lineHeight: 22, marginTop: 6 },
  moreReviewsText: { fontSize: 14, color: C.secondary, textAlign: "center", marginTop: 8, fontWeight: "600" },
  fullImgModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  closeFullImg: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  fullImg: { width: width * 0.9, height: width * 0.9 },
});
