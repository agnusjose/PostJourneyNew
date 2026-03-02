import React, { useState, useEffect } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, StatusBar,
    ScrollView, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";

const BASE_URL = "http://192.168.172.72:5000";
const C = {
    primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
    cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
    textMuted: '#8AACB8', lightTeal: '#E0F2F7',
};

export default function CaregiverListScreen({ navigation }) {
    const [caregivers, setCaregivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCaregivers = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/caregivers`);
            if (res.data.success) { setCaregivers(res.data.caregivers); }
        } catch (err) { console.error("Error fetching caregivers:", err); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchCaregivers(); }, []);
    const onRefresh = () => { setRefreshing(true); fetchCaregivers(); };

    const getInitials = (name) => {
        if (!name) return "?";
        return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    };

    const avatarColors = [C.primary, C.secondary, "#1A8C5B", "#D4880A", "#0A5F7A", "#1D8FAB", "#4A7A8C", "#0A3D52"];
    const getAvatarColor = (index) => avatarColors[index % avatarColors.length];

    const renderCaregiverCard = (caregiver, index) => (
        <TouchableOpacity key={caregiver._id} style={styles.card}
            onPress={() => navigation.navigate("CaregiverDetailScreen", { caregiver })} activeOpacity={0.7}>
            <View style={[styles.avatar, { backgroundColor: getAvatarColor(index) }]}>
                <Text style={styles.avatarText}>{getInitials(caregiver.name)}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.caregiverName}>{caregiver.name}</Text>
                {caregiver.agencyName ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={14} color={C.textSecondary} />
                        <Text style={styles.infoText}>{caregiver.agencyName}</Text>
                    </View>
                ) : null}
                {caregiver.city ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color={C.textSecondary} />
                        <Text style={styles.infoText}>{caregiver.city}</Text>
                    </View>
                ) : null}
                {caregiver.caregiverReviews && caregiver.caregiverReviews.length > 0 ? (
                    <View style={styles.infoRow}>
                        <Ionicons name="star" size={14} color="#FFC107" />
                        <Text style={styles.ratingText}>
                            {(caregiver.caregiverReviews.reduce((s, r) => s + r.rating, 0) / caregiver.caregiverReviews.length).toFixed(1)}
                        </Text>
                        <Text style={styles.infoText}>({caregiver.caregiverReviews.length})</Text>
                    </View>
                ) : null}
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.textMuted} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hdrG}>
                <View style={styles.hdr}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Caregiver Services</Text>
                        <Text style={styles.headerSubtitle}>Find professional caregivers</Text>
                    </View>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={C.secondary} />
                    <Text style={styles.loadingText}>Loading caregivers...</Text>
                </View>
            ) : caregivers.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="people-outline" size={64} color={C.textMuted} />
                    <Text style={styles.emptyTitle}>No Caregivers Available</Text>
                    <Text style={styles.emptySubtitle}>Please check back later for caregiver service providers.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.secondary]} />}>
                    <Text style={styles.resultCount}>{caregivers.length} caregiver{caregivers.length !== 1 ? "s" : ""} found</Text>
                    {caregivers.map((c, i) => renderCaregiverCard(c, i))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    hdrG: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 22 },
    hdr: { flexDirection: "row", alignItems: "center" },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: "center", alignItems: "center", marginRight: 16 },
    headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 2 },
    listContainer: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 },
    resultCount: { fontSize: 13, color: C.textSecondary, marginBottom: 16, fontWeight: "600" },
    card: {
        flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 18,
        padding: 16, marginBottom: 14, elevation: 3, shadowColor: C.primary,
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    avatar: { width: 54, height: 54, borderRadius: 27, justifyContent: "center", alignItems: "center", marginRight: 14 },
    avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    cardContent: { flex: 1 },
    caregiverName: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 4 },
    infoRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
    infoText: { fontSize: 13, color: C.textSecondary, marginLeft: 5 },
    ratingText: { fontSize: 13, fontWeight: "700", color: C.text, marginLeft: 4 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
    loadingText: { fontSize: 15, color: C.textSecondary, marginTop: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: C.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
