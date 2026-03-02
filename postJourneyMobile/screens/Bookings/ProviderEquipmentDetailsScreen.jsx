import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator, StatusBar, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const C = {
    primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
    cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
    textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
    warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B',
    lightTeal: '#E0F2F7',
};

export default function ProviderEquipmentDetailsScreen({ navigation, route }) {
    const { equipment: initialEquipment } = route.params;
    const [equipment, setEquipment] = useState(initialEquipment);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const BASE_URL = "http://192.168.172.72:5000";

    useFocusEffect(useCallback(() => { fetchEquipmentDetails(); fetchReviews(); }, [equipment._id]));

    const fetchEquipmentDetails = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/equipment/${equipment._id}`);
            if (res.data.success) { setEquipment({ ...res.data.equipment, imageUrl: equipment.imageUrl }); }
        } catch (error) { console.error("Error fetching equipment:", error); }
    };

    const fetchReviews = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/equipment/${equipment._id}/reviews`);
            if (res.data.success) setReviews(res.data.reviews || []);
        } catch (error) { console.error("Error fetching reviews:", error); }
    };

    const handleDelete = () => {
        Alert.alert("Delete Equipment", "Are you sure you want to delete this equipment? This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    setLoading(true);
                    try {
                        const res = await axios.delete(`${BASE_URL}/equipment/delete/${equipment._id}`);
                        if (res.data.success) { Alert.alert("Success", "Equipment deleted successfully"); navigation.goBack(); }
                    } catch (error) { Alert.alert("Error", "Failed to delete equipment"); } finally { setLoading(false); }
                }
            }]);
    };

    const handleEdit = () => { navigation.navigate("EditEquipment", { equipment }); };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) { stars.push(<Ionicons key={i} name={i <= rating ? "star" : "star-outline"} size={14} color="#fbbf24" style={{ marginRight: 2 }} />); }
        return stars;
    };

    const renderReviewItem = ({ item }) => (
        <View style={s.reviewItem}>
            <View style={s.reviewHeader}><Text style={s.reviewerName}>{item.userName || "Anonymous"}</Text><View style={s.reviewStars}>{renderStars(item.rating)}</View></View>
            {item.comment ? <Text style={s.reviewComment}>{item.comment}</Text> : <Text style={s.noComment}>No comment</Text>}
            <Text style={s.reviewDate}>{new Date(item.reviewDate || item.date).toLocaleDateString()}</Text>
        </View>
    );

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
                <View style={s.hdr}>
                    <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                    <Text style={s.hdrT}>Details</Text>
                    <TouchableOpacity style={s.editHeaderBtn} onPress={handleEdit}><Ionicons name="create-outline" size={24} color="#fff" /></TouchableOpacity>
                </View>
            </LinearGradient>

            {loading && (<View style={s.loadingOverlay}><ActivityIndicator size="large" color={C.secondary} /></View>)}

            <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Image Card */}
                <View style={s.imageCard}>
                    {equipment.imageUrl ? (<Image source={{ uri: equipment.imageUrl }} style={s.image} resizeMode="contain" />) : (
                        <View style={s.imagePlaceholder}><Ionicons name="image-outline" size={60} color={C.textMuted} /><Text style={s.placeholderText}>No Image</Text></View>)}
                    <View style={s.categoryBadge}><Text style={s.categoryBadgeText}>{equipment.category || "Other"}</Text></View>
                </View>

                {/* Equipment Info */}
                <View style={s.infoSection}>
                    <Text style={s.equipmentName}>{equipment.equipmentName}</Text>
                    <View style={s.ratingRow}><View style={s.starsRow}>{renderStars(equipment.averageRating || 0)}</View>
                        <Text style={s.ratingText}>{(equipment.averageRating || 0).toFixed(1)} ({equipment.totalReviews || 0} reviews)</Text></View>
                    <Text style={s.description}>{equipment.description}</Text>
                </View>

                {/* Stats Grid */}
                <View style={s.statsGrid}>
                    <View style={s.statCard}><View style={s.iconCircle}><Ionicons name="pricetag-outline" size={24} color={C.secondary} /></View>
                        <Text style={s.statValue}>₹{equipment.pricePerDay}</Text><Text style={s.statLabel}>Per Day</Text></View>
                    <View style={s.statCard}><View style={[s.iconCircle, { backgroundColor: C.successBg }]}><Ionicons name="layers-outline" size={24} color={C.success} /></View>
                        <Text style={s.statValue}>{equipment.stock}</Text><Text style={s.statLabel}>In Stock</Text></View>
                    <View style={s.statCard}><View style={[s.iconCircle, { backgroundColor: equipment.isAvailable ? C.lightTeal : '#FDEDED' }]}>
                        <Ionicons name={equipment.isAvailable ? "checkmark-circle-outline" : "close-circle-outline"} size={24} color={equipment.isAvailable ? C.secondary : C.danger} /></View>
                        <Text style={[s.statValue, { color: equipment.isAvailable ? C.secondary : C.danger }]}>{equipment.isAvailable ? "Yes" : "No"}</Text><Text style={s.statLabel}>Available</Text></View>
                </View>

                {/* Status Badges */}
                <View style={s.badgesContainer}>
                    <View style={s.badgeRow}><Text style={s.badgeLabel}>Listing Fee:</Text>
                        {equipment.listingFeePaid ? (<View style={[s.badge, s.badgeSuccess]}><Ionicons name="checkmark-circle" size={16} color={C.success} /><Text style={s.badgeSuccessText}>Paid</Text></View>)
                            : (<View style={[s.badge, s.badgeWarning]}><Ionicons name="time-outline" size={16} color={C.warning} /><Text style={s.badgeWarningText}>Pending</Text></View>)}</View>
                    <View style={s.badgeRow}><Text style={s.badgeLabel}>Visibility:</Text>
                        {equipment.isListed ? (<View style={[s.badge, s.badgeSuccess]}><Ionicons name="eye" size={16} color={C.success} /><Text style={s.badgeSuccessText}>Listed</Text></View>)
                            : (<View style={[s.badge, s.badgeWarning]}><Ionicons name="eye-off" size={16} color={C.warning} /><Text style={s.badgeWarningText}>Hidden</Text></View>)}</View>
                </View>

                {/* Reviews */}
                <View style={s.section}><Text style={s.sectionTitle}>Customer Reviews</Text>
                    {reviews.length > 0 ? (<View>{reviews.map((item, index) => <View key={index}>{renderReviewItem({ item })}</View>)}</View>)
                        : (<View style={s.noReviews}><Ionicons name="chatbubble-ellipses-outline" size={48} color={C.textMuted} /><Text style={s.noReviewsText}>No reviews yet</Text></View>)}
                    {reviews.length > 5 && (<TouchableOpacity style={s.seeAllButton} onPress={() => navigation.navigate("EquipmentReviews", { equipmentId: equipment._id })}>
                        <Text style={s.seeAllText}>See All Reviews</Text><Ionicons name="arrow-forward" size={16} color={C.secondary} /></TouchableOpacity>)}
                </View>

                {/* Actions */}
                <View style={s.actionsC}>
                    <TouchableOpacity style={s.editBtn} onPress={handleEdit}>
                        <LinearGradient colors={[C.primary, C.secondary]} style={s.editBtnG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Ionicons name="create-outline" size={20} color="#fff" /><Text style={s.actionBtnText}>Edit</Text></LinearGradient></TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}><Ionicons name="trash-outline" size={20} color={C.danger} /><Text style={s.deleteBtnText}>Delete</Text></TouchableOpacity>
                </View>
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
    editHeaderBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.7)", zIndex: 10, justifyContent: "center", alignItems: "center" },
    content: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },
    imageCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: C.card, elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, marginBottom: 20, height: 250, position: 'relative', borderWidth: 1, borderColor: C.cardBorder },
    image: { width: "100%", height: "100%", backgroundColor: '#fff' },
    imagePlaceholder: { width: "100%", height: "100%", backgroundColor: C.lightTeal, justifyContent: "center", alignItems: "center" },
    placeholderText: { color: C.textMuted, marginTop: 8, fontWeight: '600' },
    categoryBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(10, 95, 122, 0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    categoryBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
    infoSection: { marginBottom: 20 },
    equipmentName: { fontSize: 26, fontWeight: "800", color: C.text, marginBottom: 8, letterSpacing: -0.5 },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    starsRow: { flexDirection: "row" },
    ratingText: { fontSize: 14, color: C.textSecondary, fontWeight: '500' },
    description: { fontSize: 15, color: C.textSecondary, lineHeight: 24 },
    statsGrid: { flexDirection: "row", gap: 12, marginBottom: 20 },
    statCard: { flex: 1, backgroundColor: C.card, padding: 16, borderRadius: 20, alignItems: "center", elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, borderWidth: 1, borderColor: C.cardBorder },
    iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.lightTeal, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    statValue: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 2 },
    statLabel: { fontSize: 11, color: C.textSecondary, fontWeight: "600" },
    badgesContainer: { backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1, borderColor: C.cardBorder },
    badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    badgeLabel: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
    badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6, borderWidth: 1 },
    badgeSuccess: { backgroundColor: C.successBg, borderColor: '#C8E6D4' },
    badgeWarning: { backgroundColor: C.warningBg, borderColor: '#FFE8B3' },
    badgeSuccessText: { color: C.success, fontWeight: "700", fontSize: 12 },
    badgeWarningText: { color: C.warning, fontWeight: "700", fontSize: 12 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 16 },
    reviewItem: { backgroundColor: C.card, padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1, borderColor: C.cardBorder },
    reviewHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    reviewerName: { fontSize: 14, fontWeight: "700", color: C.text },
    reviewStars: { flexDirection: "row" },
    reviewComment: { fontSize: 14, color: C.textSecondary, marginBottom: 8, lineHeight: 20 },
    noComment: { fontSize: 13, color: C.textMuted, fontStyle: "italic", marginBottom: 6 },
    reviewDate: { fontSize: 11, color: C.textMuted },
    noReviews: { alignItems: "center", paddingVertical: 20, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder, borderStyle: 'dashed' },
    noReviewsText: { color: C.textMuted, marginTop: 8, fontWeight: '500' },
    seeAllButton: { flexDirection: 'row', alignItems: "center", justifyContent: 'center', paddingVertical: 12, marginTop: 8 },
    seeAllText: { color: C.secondary, fontWeight: "700", marginRight: 4 },
    actionsC: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    editBtn: { flex: 1, borderRadius: 15, overflow: 'hidden', elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    editBtnG: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, gap: 8 },
    deleteBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.card, padding: 16, borderRadius: 15, gap: 8, borderWidth: 1, borderColor: C.danger },
    actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    deleteBtnText: { color: C.danger, fontSize: 16, fontWeight: "700" },
});
