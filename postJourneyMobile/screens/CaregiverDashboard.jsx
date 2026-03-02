import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const BASE_URL = "http://10.63.72.99:5000";

const C = {
    primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
    cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
    textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
    warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B',
    dangerBg: '#FDEDED', lightTeal: '#E0F2F7',
};

export default function CaregiverDashboard({ route, navigation }) {
    const { userId, userName, userEmail } = route.params || {};
    const { logout, user } = useAuth();
    const displayUser = userId ? { userId, userName, userEmail } : user;

    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchReviews = async () => {
        try {
            const res = await axios.get(
                `${BASE_URL}/api/caregiver/${displayUser?.userId}/reviews`
            );
            if (res.data.success) {
                setReviews(res.data.reviews);
                setAverageRating(res.data.averageRating);
                setTotalReviews(res.data.totalReviews);
            }
        } catch (err) {
            console.error("Error fetching reviews:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (displayUser?.userId) {
                fetchReviews();
            }
        }, [displayUser?.userId])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchReviews();
    };

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    await logout();
                    navigation.replace("LoginScreen");
                },
            },
        ]);
    };

    useEffect(() => {
        if (!displayUser?.userId) {
            if (!user) {
                Alert.alert("Error", "User ID not found. Please login again.");
                navigation.replace("LoginScreen");
            }
        }
    }, [displayUser]);

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i <= rating ? "star" : i - 0.5 <= rating ? "star-half" : "star-outline"}
                    size={16}
                    color="#FFC107"
                />
            );
        }
        return stars;
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hdrG}>
                <View style={styles.hdr}>
                    <View>
                        <Text style={styles.welcome}>Welcome Back,</Text>
                        <Text style={styles.userName}>{displayUser?.userName || "Caregiver"}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() =>
                            navigation.navigate("ServiceProviderProfileScreen", {
                                userId: displayUser?.userId,
                                userEmail: displayUser?.userEmail,
                            })
                        }
                    >
                        <Ionicons name="person-circle-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[C.secondary]}
                    />
                }
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>
                                {(displayUser?.userName || "U").charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>
                                {displayUser?.userName || "Caregiver"}
                            </Text>
                            <Text style={styles.email}>
                                {displayUser?.userEmail || "No Email"}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={20} color="#FFC107" />
                                <Text style={styles.statValue}>
                                    {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                                </Text>
                            </View>
                            <Text style={styles.statLabel}>Avg Rating</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{totalReviews}</Text>
                            <Text style={styles.statLabel}>Total Reviews</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <View style={styles.ratingRow}>
                                <Ionicons
                                    name="checkmark-circle"
                                    size={20}
                                    color={C.success}
                                />
                            </View>
                            <Text style={styles.statLabel}>Verified</Text>
                        </View>
                    </View>
                </View>

                {/* Action Cards */}
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => { }}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: C.warningBg }]}>
                            <Ionicons name="star-outline" size={32} color={C.warning} />
                        </View>
                        <Text style={styles.actionTitle}>Reviews</Text>
                        <Text style={styles.actionSubtitle}>
                            {totalReviews} review{totalReviews !== 1 ? "s" : ""}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate("ComplaintsScreen", {
                            userId: displayUser?.userId,
                            userName: displayUser?.userName,
                            userType: "service-provider",
                        })}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: C.dangerBg }]}>
                            <Ionicons name="flag-outline" size={32} color={C.danger} />
                        </View>
                        <Text style={styles.actionTitle}>Complaints</Text>
                        <Text style={styles.actionSubtitle}>Submit or track</Text>
                    </TouchableOpacity>
                </View>

                {/* Reviews Section */}
                <View style={styles.reviewsSection}>
                    <Text style={styles.sectionTitle}>Patient Reviews</Text>

                    {loading ? (
                        <ActivityIndicator
                            size="small"
                            color={C.secondary}
                            style={{ marginTop: 20 }}
                        />
                    ) : reviews.length === 0 ? (
                        <View style={styles.emptyReviews}>
                            <Ionicons
                                name="chatbubble-ellipses-outline"
                                size={48}
                                color={C.textMuted}
                            />
                            <Text style={styles.emptyText}>No reviews yet</Text>
                            <Text style={styles.emptySubtext}>
                                Reviews from patients will appear here
                            </Text>
                        </View>
                    ) : (
                        reviews.map((review, index) => (
                            <View key={index} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewAvatar}>
                                        <Text style={styles.reviewAvatarText}>
                                            {(review.userName || "?").charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.reviewUserName}>
                                            {review.userName}
                                        </Text>
                                        <View style={styles.starsRow}>
                                            {renderStars(review.rating)}
                                        </View>
                                    </View>
                                    <Text style={styles.reviewDate}>
                                        {new Date(review.date).toLocaleDateString()}
                                    </Text>
                                </View>
                                {review.comment ? (
                                    <Text style={styles.reviewComment}>{review.comment}</Text>
                                ) : null}
                            </View>
                        ))
                    )}
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons
                        name="log-out-outline"
                        size={20}
                        color={C.danger}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    hdrG: { paddingTop: 54, paddingBottom: 22, paddingHorizontal: 22 },
    hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcome: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: "500" },
    userName: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
    profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

    content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 },

    profileCard: {
        backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 24,
        elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, borderWidth: 1, borderColor: C.cardBorder,
    },
    profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    avatarCircle: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: C.secondary,
        justifyContent: "center", alignItems: "center", marginRight: 16,
    },
    avatarText: { color: "#fff", fontSize: 24, fontWeight: "700" },
    name: { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 2 },
    email: { fontSize: 14, color: C.textSecondary },
    divider: { height: 1, backgroundColor: C.cardBorder, marginBottom: 14 },
    statsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
    statItem: { alignItems: "center" },
    statValue: { fontSize: 20, fontWeight: "800", color: C.text },
    statLabel: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    statDivider: { width: 1, height: 36, backgroundColor: C.cardBorder },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },

    actionsGrid: { flexDirection: "row", justifyContent: "space-between", gap: 16, marginBottom: 24 },
    actionCard: {
        flex: 1, backgroundColor: C.card, padding: 16, borderRadius: 18, alignItems: "center",
        elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: C.cardBorder,
    },
    iconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 12 },
    actionTitle: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 2 },
    actionSubtitle: { fontSize: 12, color: C.textMuted },

    reviewsSection: {
        backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 24,
        elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder,
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 16 },
    emptyReviews: { alignItems: "center", paddingVertical: 30 },
    emptyText: { fontSize: 16, fontWeight: "600", color: C.textSecondary, marginTop: 12 },
    emptySubtext: { fontSize: 13, color: C.textMuted, marginTop: 4 },

    reviewCard: {
        backgroundColor: C.lightTeal, borderRadius: 14, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    reviewHeader: { flexDirection: "row", alignItems: "center" },
    reviewAvatar: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: C.secondary,
        justifyContent: "center", alignItems: "center", marginRight: 10,
    },
    reviewAvatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    reviewUserName: { fontSize: 14, fontWeight: "700", color: C.text },
    starsRow: { flexDirection: "row", marginTop: 2 },
    reviewDate: { fontSize: 11, color: C.textMuted },
    reviewComment: { fontSize: 13, color: C.textSecondary, marginTop: 10, lineHeight: 19 },

    logoutBtn: {
        flexDirection: "row", backgroundColor: C.card, padding: 18, borderRadius: 15,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: C.dangerBg, elevation: 2,
    },
    logoutText: { color: C.danger, fontWeight: "700", fontSize: 16 },
});
