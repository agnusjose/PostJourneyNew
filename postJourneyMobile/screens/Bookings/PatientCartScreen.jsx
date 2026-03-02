// PatientCartScreen.jsx
import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Image, ActivityIndicator, StatusBar,
} from "react-native";
import { useCart } from "../../context/CartContext";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
  cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
  textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
  warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B',
  lightTeal: '#E0F2F7',
};

export default function PatientCartScreen() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    validateSelectedStock,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    getSelectedItems,
    getSelectedTotal,
    getSelectedCount,
    loading: cartLoading
  } = useCart();

  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [checkingStock, setCheckingStock] = useState({});
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [allSelected, setAllSelected] = useState(false);

  const BASE_URL = "http://10.63.72.99:5000";

  // Update allSelected state
  useEffect(() => {
    if (cart.length > 0) {
      const allSelected = cart.every(item => item.selected);
      setAllSelected(allSelected);
    } else {
      setAllSelected(false);
    }
  }, [cart]);

  // Check for out of stock items
  useEffect(() => {
    const checkStock = async () => {
      if (cart.length === 0) {
        setOutOfStockItems([]);
        return;
      }

      const stockValidation = await validateSelectedStock();
      if (stockValidation && Array.isArray(stockValidation)) {
        const unavailableItems = stockValidation.filter(item => !item.available);
        setOutOfStockItems(unavailableItems.map(item => item.itemId));
      } else {
        // Handle case where stockValidation is undefined or failed
        console.warn("Stock validation returned unexpected result");
      }
    };

    checkStock();
  }, [cart]);

  const handleToggleSelectAll = () => {
    if (allSelected) {
      deselectAllItems();
    } else {
      selectAllItems();
    }
  };

  const handleQuantityChange = async (itemId, change) => {
    const item = cart.find(item => item._id === itemId);
    if (!item) return;

    const currentQty = item.quantity || 1;
    const newQty = Math.max(1, currentQty + change);

    if (newQty === currentQty) return;

    setCheckingStock(prev => ({ ...prev, [itemId]: true }));

    try {
      const success = await updateQuantity(itemId, newQty);
      if (!success) {
        Alert.alert("Error", "Failed to update quantity");
      }
    } catch (error) {
      Alert.alert("Stock Limit", error.message);
    } finally {
      setCheckingStock(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRemoveItem = (itemId) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFromCart(itemId)
        }
      ]
    );
  };

  const handleCheckout = async () => {
    const selectedItems = getSelectedItems();

    if (selectedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select items to checkout");
      return;
    }

    // Check for out of stock items
    const selectedOutOfStock = selectedItems.filter(item =>
      outOfStockItems.includes(item._id)
    );

    if (selectedOutOfStock.length > 0) {
      const itemNames = selectedOutOfStock.map(item => `• ${item.equipmentName}`).join('\n');
      Alert.alert(
        "Stock Issue",
        `Some selected items are no longer available:\n\n${itemNames}\n\nPlease remove them before checkout.`,
        [{ text: "OK" }]
      );
      return;
    }

    setLoading(true);
    try {
      // Validate stock with fresh data
      const stockValidation = await validateSelectedStock();
      const unavailableItems = stockValidation.filter(item => !item.available);

      if (unavailableItems.length > 0) {
        const itemNames = unavailableItems.map(item =>
          `• ${item.itemName}: Only ${item.currentStock} available, requested ${item.requested}`
        ).join('\n');

        Alert.alert(
          "Stock Issue",
          `Some items are no longer available:\n\n${itemNames}\n\nPlease update your cart.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Navigate to checkout with selected items
      navigation.navigate("CheckoutScreen", {
        selectedCartItems: selectedItems
      });
    } catch (error) {
      Alert.alert("Error", "Failed to validate cart items");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueShopping = () => {
    navigation.navigate("PatientEquipmentList");
  };

  const renderItem = ({ item }) => {
    const quantity = item.quantity || 1;
    const currentStock = item.currentStock || 0;
    const imageUrl = item.imageUrl
      ? `${BASE_URL}${item.imageUrl}`
      : "https://via.placeholder.com/100";

    const isCheckingStock = checkingStock[item._id];
    const isOutOfStock = currentStock < quantity;
    const canIncrease = currentStock > quantity;

    return (
      <View style={[s.cartItem, isOutOfStock && s.outOfStockItem]}>
        {/* Selection checkbox */}
        <TouchableOpacity
          style={s.checkbox}
          onPress={() => toggleItemSelection(item._id)}
        >
          {item.selected ? (
            <Ionicons name="checkbox" size={24} color={C.secondary} />
          ) : (
            <Ionicons name="square-outline" size={24} color={C.textMuted} />
          )}
        </TouchableOpacity>

        <Image source={{ uri: imageUrl }} style={s.itemImage} />

        <View style={s.itemDetails}>
          <Text style={[s.itemName, isOutOfStock && s.outOfStockText]}>
            {item.equipmentName}
          </Text>
          <Text style={s.itemProvider}>Provider: {item.providerName}</Text>

          <View style={s.priceRow}>
            <Text style={[s.itemPrice, isOutOfStock && s.outOfStockText]}>
              ₹ {item.pricePerDay} / day
            </Text>
            <Text style={[s.itemTotal, isOutOfStock && s.outOfStockText]}>
              ₹ {item.pricePerDay * quantity} total/day
            </Text>
          </View>

          <View style={s.stockRow}>
            <Text style={[
              s.stockText,
              isOutOfStock && s.outOfStockText
            ]}>
              {isOutOfStock
                ? `Currently unavailable (${currentStock} in stock)`
                : `Available: ${currentStock} units`
              }
            </Text>
          </View>

          <View style={s.quantityControls}>
            <TouchableOpacity
              style={[s.qtyBtn, (quantity <= 1 || isOutOfStock || isCheckingStock) && s.disabledQtyBtn]}
              onPress={() => handleQuantityChange(item._id, -1)}
              disabled={quantity <= 1 || isOutOfStock || isCheckingStock}
            >
              <Ionicons name="remove" size={20} color={
                quantity <= 1 || isOutOfStock || isCheckingStock ? C.textMuted : C.text
              } />
            </TouchableOpacity>

            {isCheckingStock ? (
              <ActivityIndicator size="small" color={C.secondary} style={s.qtyLoader} />
            ) : (
              <Text style={[
                s.qtyText,
                isOutOfStock && s.outOfStockText
              ]}>
                {quantity}
              </Text>
            )}

            <TouchableOpacity
              style={[s.qtyBtn, (!canIncrease || isOutOfStock || isCheckingStock) && s.disabledQtyBtn]}
              onPress={() => handleQuantityChange(item._id, 1)}
              disabled={!canIncrease || isOutOfStock || isCheckingStock}
            >
              <Ionicons name="add" size={20} color={
                !canIncrease || isOutOfStock || isCheckingStock ? C.textMuted : C.text
              } />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.removeBtn}
              onPress={() => handleRemoveItem(item._id)}
              disabled={isCheckingStock}
            >
              <Ionicons name="trash" size={18} color={C.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const selectedItems = getSelectedItems();
  const selectedTotal = getSelectedTotal();
  const selectedCount = getSelectedCount();
  const hasSelectedItems = selectedItems.length > 0;
  const hasOutOfStockSelected = selectedItems.some(item =>
    outOfStockItems.includes(item._id)
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Gradient Header */}
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
        <View style={s.hdr}>
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.hdrT}>My Cart</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate("PatientEquipmentList")}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {cart.length === 0 ? (
        <View style={s.emptyContainer}>
          <View style={s.iconCircle}>
            <Ionicons name="cart-outline" size={60} color={C.textMuted} />
          </View>
          <Text style={s.emptyText}>Your cart is empty</Text>
          <Text style={s.emptySubtext}>
            Add equipment to get started
          </Text>
          <TouchableOpacity
            style={s.shopBtn}
            onPress={handleContinueShopping}
          >
            <Text style={s.shopBtnText}>Browse Equipment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Selection Header */}
          <View style={s.selectionHeader}>
            <TouchableOpacity
              style={s.selectAllBtn}
              onPress={handleToggleSelectAll}
            >
              {allSelected ? (
                <Ionicons name="checkbox" size={24} color={C.secondary} />
              ) : (
                <Ionicons name="square-outline" size={24} color={C.textMuted} />
              )}
              <Text style={s.selectAllText}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            <Text style={s.selectedCount}>
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </Text>
          </View>

          {hasOutOfStockSelected && (
            <View style={s.outOfStockBanner}>
              <Ionicons name="alert-circle" size={20} color="#fff" />
              <Text style={s.outOfStockBannerText}>
                Some selected items are unavailable
              </Text>
            </View>
          )}

          <FlatList
            data={cart}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={s.cartList}
            showsVerticalScrollIndicator={false}
          />

          <View style={s.summaryContainer}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal ({selectedCount} items)</Text>
              <Text style={s.summaryValue}>₹ {selectedTotal.toFixed(2)}/day</Text>
            </View>

            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Delivery</Text>
              <Text style={s.summaryValue}>Free</Text>
            </View>

            <View style={s.divider} />

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Amount/Day</Text>
              <Text style={s.totalAmount}>₹ {selectedTotal.toFixed(2)}</Text>
            </View>

            {hasOutOfStockSelected && (
              <View style={s.warningBox}>
                <Ionicons name="alert-circle" size={18} color={C.warning} />
                <Text style={s.warningText}>
                  Remove unavailable items before checkout
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                s.checkoutBtn,
                (loading || !hasSelectedItems || hasOutOfStockSelected) && s.disabledBtn
              ]}
              onPress={handleCheckout}
              disabled={loading || !hasSelectedItems || hasOutOfStockSelected}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={20} color="#fff" />
                  <Text style={s.checkoutText}>
                    {!hasSelectedItems ? 'Select Items to Checkout' :
                      hasOutOfStockSelected ? 'Fix Items First' : 'Proceed to Checkout'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.continueBtn}
              onPress={handleContinueShopping}
              disabled={loading}
            >
              <Text style={s.continueText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}


const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  hdr: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hdrT: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.lightTeal,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: { fontSize: 22, fontWeight: '700', color: C.text, marginTop: 16 },
  emptySubtext: { fontSize: 16, color: C.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 24 },
  shopBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 15, marginTop: 30,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  shopBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  cartList: { padding: 22 },
  cartItem: {
    flexDirection: "row", backgroundColor: C.card, borderRadius: 20,
    padding: 16, marginBottom: 16, elevation: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
    position: "relative", borderWidth: 1, borderColor: C.cardBorder,
  },
  outOfStockItem: { backgroundColor: "#FFF8F8", borderColor: "#FECACA" },

  itemImage: { width: 80, height: 80, borderRadius: 15, backgroundColor: C.lightTeal },
  itemDetails: { flex: 1, marginLeft: 16 },
  itemName: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 4 },
  outOfStockText: { color: C.danger },
  itemProvider: { fontSize: 12, color: C.textSecondary, marginBottom: 8, fontWeight: "500" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: "700", color: C.text },
  itemTotal: { fontSize: 14, color: C.success, fontWeight: "600" },
  stockRow: { marginBottom: 12 },
  stockText: { fontSize: 12, color: C.textMuted },

  quantityControls: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.lightTeal,
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.cardBorder,
  },
  disabledQtyBtn: { backgroundColor: C.bg, borderColor: C.cardBorder, opacity: 0.5 },
  qtyLoader: { marginHorizontal: 16, minWidth: 30 },
  qtyText: { fontSize: 16, fontWeight: "700", marginHorizontal: 16, minWidth: 30, textAlign: "center", color: C.text },
  removeBtn: { marginLeft: "auto", padding: 8, backgroundColor: '#FDEDED', borderRadius: 8 },

  summaryContainer: {
    backgroundColor: C.card, padding: 22,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    shadowColor: C.primary, shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: C.textSecondary, fontWeight: "500" },
  summaryValue: { fontSize: 14, color: C.text, fontWeight: "600" },
  divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  totalLabel: { fontSize: 18, fontWeight: "700", color: C.text },
  totalAmount: { fontSize: 22, fontWeight: "800", color: C.success },

  warningBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.warningBg,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFE8B3', marginBottom: 20, gap: 8,
  },
  warningText: { fontSize: 13, color: C.warning, flex: 1, fontWeight: "500" },

  checkoutBtn: {
    flexDirection: "row", backgroundColor: C.primary, padding: 18, borderRadius: 15,
    alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  disabledBtn: { backgroundColor: C.textMuted, shadowOpacity: 0, elevation: 0 },
  checkoutText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  continueBtn: { padding: 16, borderRadius: 15, alignItems: "center", borderWidth: 1, borderColor: C.secondary },
  continueText: { color: C.secondary, fontSize: 16, fontWeight: "700" },

  selectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 22, paddingVertical: 10 },
  selectAllBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectAllText: { fontSize: 14, color: C.textSecondary, fontWeight: "600" },
  selectedCount: { fontSize: 14, color: C.secondary, fontWeight: "600" },
  checkbox: { marginRight: 10 },

  outOfStockBanner: {
    backgroundColor: C.danger, flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 12, gap: 8, marginHorizontal: 22, borderRadius: 12, marginBottom: 10,
  },
  outOfStockBannerText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
