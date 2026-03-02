import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    ActivityIndicator,
    Image,
    StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
    bg: "#F0F6F9", surface: "#FFFFFF",
    textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8",
    cardBorder: "#DBE8EE", success: "#10B981", danger: "#EF4444",
};

export default function ManageDoctors({ navigation }) {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    const BASE_URL = Platform.OS === "web"
        ? "http://localhost:5000"
        : "http://172.16.230.150:5000";

    const fetchDoctors = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/admin/doctors`);
            if (response.data.success) {
                setDoctors(response.data.users);
            } else {
                Alert.alert("Error", "Failed to fetch doctors");
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to fetch doctors");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchDoctors();
        });
        return unsubscribe;
    }, [navigation]);

    const handleDeleteDoctor = async (id) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this doctor?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.delete(`${BASE_URL}/admin/users/${id}`);
                            fetchDoctors();
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete doctor");
                        }
                    }
                }
            ]
        );
    };

    const renderDoctor = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("AdminUserDetailsScreen", {
                userId: item._id,
                userType: 'doctor'
            })}
            activeOpacity={0.75}
        >
            <View style={styles.cardRow}>
                <View style={styles.avatarWrap}>
                    {item.doctorImage ? (
                        <Image
                            source={{ uri: item.doctorImage ? `${BASE_URL.replace('/api', '')}${item.doctorImage}` : undefined }}
                            style={styles.doctorPhoto}
                        />
                    ) : (
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarLetter}>
                                {(item.name || "?").charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? C.success : C.textLight }]} />
                </View>

                <View style={styles.cardInfo}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={styles.specBadge}>
                        <MaterialCommunityIcons name="stethoscope" size={12} color={C.secondary} />
                        <Text style={styles.specText}>{item.specialization || 'General'}</Text>
                    </View>
                    <View style={styles.detailsWrap}>
                        <View style={styles.detailChip}>
                            <MaterialCommunityIcons name="email-outline" size={11} color={C.textLight} />
                            <Text style={styles.detailText} numberOfLines={1}>{item.email}</Text>
                        </View>
                        <View style={styles.detailChip}>
                            <MaterialCommunityIcons name="phone-outline" size={11} color={C.textLight} />
                            <Text style={styles.detailText}>{item.phone || 'N/A'}</Text>
                        </View>
                    </View>
                    <View style={styles.feeRow}>
                        <MaterialCommunityIcons name="currency-inr" size={14} color={C.primary} />
                        <Text style={styles.feeText}>₹{item.consultationFee || 0}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteDoctor(item._id)}
                >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={C.danger} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />

            {/* Gradient Header */}
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.heroCenter}>
                    <Text style={styles.heroTitle}>Manage Doctors</Text>
                    <Text style={styles.heroSub}>{doctors.length} registered doctors</Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={fetchDoctors}>
                    <MaterialCommunityIcons name="refresh" size={22} color="#fff" />
                </TouchableOpacity>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={styles.loadingText}>Loading doctors...</Text>
                </View>
            ) : (
                <FlatList
                    data={doctors}
                    keyExtractor={(item) => item._id}
                    renderItem={renderDoctor}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <MaterialCommunityIcons name="doctor" size={52} color={C.textLight} />
                            <Text style={styles.emptyText}>No doctors found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    // Hero Header
    hero: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12,
        paddingBottom: 16, paddingHorizontal: 18,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center", alignItems: "center",
    },
    heroCenter: { flex: 1, alignItems: "center" },
    heroTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
    heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 2 },
    refreshBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center", alignItems: "center",
    },

    // List
    list: { padding: 16, paddingBottom: 30 },

    // Card
    card: {
        backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, shadowColor: C.textDark,
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8,
    },
    cardRow: { flexDirection: "row", alignItems: "center" },
    avatarWrap: { position: "relative", marginRight: 14 },
    avatarCircle: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: "#E6F3F7", justifyContent: "center", alignItems: "center",
    },
    avatarLetter: { fontSize: 22, fontWeight: "800", color: C.primary },
    doctorPhoto: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#E6F3F7" },
    onlineDot: {
        position: "absolute", bottom: 0, right: 0,
        width: 12, height: 12, borderRadius: 6,
        borderWidth: 2, borderColor: C.surface,
    },

    cardInfo: { flex: 1 },
    name: { fontSize: 15, fontWeight: "800", color: C.textDark, marginBottom: 4 },
    specBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: "#E6F3F7", paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8, alignSelf: "flex-start", marginBottom: 6,
    },
    specText: { fontSize: 11, fontWeight: "700", color: C.secondary },
    detailsWrap: { gap: 3, marginBottom: 6 },
    detailChip: { flexDirection: "row", alignItems: "center", gap: 4 },
    detailText: { fontSize: 11, color: C.textLight, fontWeight: "500", flexShrink: 1 },
    feeRow: { flexDirection: "row", alignItems: "center", gap: 2 },
    feeText: { fontSize: 14, fontWeight: "800", color: C.primary },

    deleteBtn: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center",
        marginLeft: 8,
    },

    // States
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
    loadingText: { color: C.textLight, fontWeight: "600", fontSize: 14 },
    emptyText: { color: C.textLight, fontWeight: "600", fontSize: 15 },
});
