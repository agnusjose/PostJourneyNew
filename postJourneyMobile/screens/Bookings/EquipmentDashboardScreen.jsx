import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  Modal,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

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

export default function EquipmentDashboardScreen({ route, navigation }) {
  const routeProviderId = route.params?.providerId;
  const { user } = useAuth();
  const authProviderId = user?.userId;
  const providerId = routeProviderId || authProviderId;

  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const BASE_URL = "http://192.168.172.72:5000";

  console.log("🔍 EquipmentDashboardScreen - providerId:", providerId);

  const fetchEquipment = async () => {
    try {
      if (!providerId) {
        Alert.alert("Error", "Provider ID not found. Please login again.");
        navigation.goBack();
        return;
      }

      console.log("🔍 Fetching equipment for provider:", providerId);

      const listedRes = await axios.get(
        `${BASE_URL}/equipment/provider/${providerId}/listed`
      );

      const pendingRes = await axios.get(
        `${BASE_URL}/equipment/provider/${providerId}/pending-fee`
      );

      const listedWithFullUrls = (listedRes.data.equipment || []).map(item => ({
        ...item,
        imageUrl: item.imageUrl
          ? `${BASE_URL}${item.imageUrl}`
          : null,
        status: "listed"
      }));

      const pendingWithFullUrls = (pendingRes.data.equipment || []).map(item => ({
        ...item,
        imageUrl: item.imageUrl
          ? `${BASE_URL}${item.imageUrl}`
          : null,
        status: "pending",
        listingFee: item.listingFeeAmount || (item.pricePerDay * 0.05)
      }));

      setEquipmentList([...pendingWithFullUrls, ...listedWithFullUrls]);

    } catch (err) {
      console.error("❌ Error fetching equipment:", err);

      try {
        const fallbackRes = await axios.get(
          `${BASE_URL}/equipment/provider/${providerId}`
        );

        if (fallbackRes.data.success) {
          const allEquipment = (fallbackRes.data.equipment || []).map(item => ({
            ...item,
            imageUrl: item.imageUrl ? `${BASE_URL}${item.imageUrl}` : null,
            status: (item.listingFeePaid && item.isListed) ? "listed" : "pending",
            listingFee: item.listingFeeAmount || (item.pricePerDay * 0.05)
          }));
          allEquipment.sort((a, b) => (a.status === 'pending' ? -1 : 1));
          setEquipmentList(allEquipment);
        }
      } catch (fallbackErr) {
        console.error("❌ Fallback fetch failed:", fallbackErr);
        Alert.alert("Error", "Failed to load equipment");
        setEquipmentList([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (providerId) {
        fetchEquipment();
      }
    }, [providerId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  const handlePayFee = (equipment) => {
    Alert.alert(
      "Pay Listing Fee",
      `Pay 5% listing fee (₹${equipment.listingFee?.toFixed(2) || (equipment.pricePerDay * 0.05).toFixed(2)}) to list this equipment?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          onPress: () => {
            navigation.navigate("PaymentScreen", {
              type: "listing_fee",
              amount: equipment.listingFee || (equipment.pricePerDay * 0.05),
              equipmentId: equipment._id,
              providerId: providerId,
            });
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ProviderEquipmentDetailsScreen", { equipment: item })}
      activeOpacity={0.9}
    >
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          if (item.imageUrl) {
            setSelectedImage(item.imageUrl);
            setImageModalVisible(true);
          }
        }}
        style={styles.imageContainer}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{item.equipmentName}</Text>
          {item.stock > 0 ? (
            <View style={[styles.stockBadge, item.status === 'pending' ? styles.pendingStockBadge : {}]}>
              <Text style={[styles.stockText, item.status === 'pending' ? styles.pendingStockText : {}]}>
                {item.status === 'pending' ? 'Pending' : `${item.stock} left`}
              </Text>
            </View>
          ) : (
            <View style={[styles.stockBadge, styles.outOfStockBadge]}>
              <Text style={[styles.stockText, styles.outOfStockText]}>Out</Text>
            </View>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <Text style={styles.price}>₹ {item.pricePerDay} <Text style={styles.perDay}>/ day</Text></Text>

        <View style={styles.buttonRow}>
          {item.status === "pending" ? (
            <TouchableOpacity
              style={styles.payFeeBtn}
              onPress={(e) => {
                e.stopPropagation();
                handlePayFee(item);
              }}
            >
              <Text style={styles.payFeeText}>Pay Fee</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={18} color={C.gold} />
              <Text style={styles.ratingText}>
                {item.averageRating ? item.averageRating.toFixed(1) : "0.0"}
                <Text style={styles.ratingCount}> ({item.totalReviews || 0})</Text>
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleDelete = async (id) => {
    Alert.alert(
      "Delete Equipment",
      "Are you sure you want to delete this equipment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // ...
          }
        }
      ]
    );
  };

  const handleBack = () => {
    console.log("Navigating back to ServiceProviderDashboard");
    const routeParams = route.params || {};

    if (routeParams.userId) {
      navigation.navigate("ServiceProviderDashboard", {
        userId: routeParams.userId,
        userName: routeParams.userName,
        userEmail: routeParams.userEmail,
      });
    } else if (authProviderId) {
      navigation.navigate("ServiceProviderDashboard", {
        userId: authProviderId,
        userName: user?.name || "User",
        userEmail: user?.email || "N/A",
      });
    } else {
      navigation.navigate("ServiceProviderDashboard");
    }
  };

  const sortedList = [...equipmentList].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Gradient Header */}
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.headerGradient}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.header}>My Equipment</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {!loading && sortedList.length > 0 && (
          <Text style={styles.countText}>
            Total Items: {sortedList.length}
          </Text>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.secondary} />
            <Text style={styles.loadingText}>Loading equipment...</Text>
          </View>
        ) : sortedList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cube-outline" size={48} color={C.textMuted} />
            </View>
            <Text style={styles.empty}>No equipment found</Text>
            <Text style={styles.emptySubtext}>Add new equipment to get started</Text>
            <TouchableOpacity onPress={fetchEquipment} style={styles.retryBtn}>
              <Text style={styles.retryText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <FlatList
          data={sortedList}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.secondary]}
            />
          }
        />

        {/* ➕ ADD EQUIPMENT BUTTON */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            navigation.navigate("AddEquipment", {
              providerId,
            })
          }
        >
          <LinearGradient
            colors={[C.primary, C.secondary]}
            style={styles.addBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add-circle-outline" size={22} color="#fff" />
            <Text style={styles.addText}>Add Equipment</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Fullscreen Image Modal */}
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setImageModalVisible(false)}
          >
            <View style={styles.modalContent}>
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setImageModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1 },

  headerGradient: {
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    flex: 1,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },

  countText: {
    textAlign: "center",
    color: C.textSecondary,
    marginBottom: 6,
    marginTop: 14,
    fontSize: 14,
    fontWeight: "600",
  },

  card: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 14,
    elevation: 3,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 12,
    alignItems: 'center',
  },
  imageContainer: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.lightTeal,
    marginRight: 14,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: C.textMuted,
    fontSize: 10,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    flex: 1,
    marginRight: 8,
  },
  stockBadge: {
    backgroundColor: C.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.success,
  },
  outOfStockBadge: {
    backgroundColor: C.dangerBg,
  },
  outOfStockText: {
    color: C.danger,
  },
  pendingStockBadge: {
    backgroundColor: C.warningBg,
  },
  pendingStockText: {
    color: C.warning,
  },

  description: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },

  price: {
    fontWeight: "700",
    fontSize: 15,
    color: C.success,
    marginBottom: 8,
  },
  perDay: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: 'normal',
  },

  pendingBadge: {
    marginBottom: 8,
  },
  pendingText: {
    color: C.warning,
    fontSize: 12,
    fontWeight: "600",
  },

  buttonRow: {
    flexDirection: "row",
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  editBtn: {
    backgroundColor: C.lightTeal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  btnText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.danger,
  },
  deleteText: {
    color: C.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  payFeeBtn: {
    backgroundColor: C.gold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  payFeeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },

  listContent: {
    paddingBottom: 120,
    paddingTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.lightTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  empty: {
    textAlign: "center",
    fontSize: 17,
    color: C.text,
    marginBottom: 8,
    fontWeight: "700",
  },
  emptySubtext: {
    textAlign: "center",
    fontSize: 14,
    color: C.textMuted,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: C.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
  },
  addBtn: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  addText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  loadingText: {
    marginTop: 16,
    color: C.textSecondary,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.warningBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFF0C8',
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '700',
    color: C.warning,
    fontSize: 13,
  },
  ratingCount: {
    color: '#D4A030',
    fontWeight: '500',
    fontSize: 12,
  },
});
