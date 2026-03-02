import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ScrollView,
    Linking,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const BASE_URL = "http://10.63.72.99:5000";

const C = {
    primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
    cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
    textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
    warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B',
    lightTeal: '#E0F2F7',
};

export default function CaregiverDetailScreen({ route, navigation }) {
    const { caregiver } = route.params;
    const { user } = useAuth();

    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [loadingReviews, setLoadingReviews] = useState(true);

    const fetchReviews = async () => {
        try {
            const res = await axios.get(
                `${BASE_URL}/api/caregiver/${caregiver._id}/reviews`
            );
            if (res.data.success) {
                setReviews(res.data.reviews);
                setAverageRating(res.data.averageRating);
                setTotalReviews(res.data.totalReviews);
            }
        } catch (err) {
            console.error("Error fetching reviews:", err);
        } finally {
            setLoadingReviews(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchReviews();
        }, [caregiver._id])
    );

    const getInitials = (name) => {
        if (!name) return "?";
        return name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const handleCall = () => {
        if (caregiver.phoneNumber) {
            Linking.openURL(`tel:${caregiver.phoneNumber}`);
        } else {
            Alert.alert("Unavailable", "Phone number not available");
        }
    };

    const handleEmail = () => {
        if (caregiver.email) {
            Linking.openURL(`mailto:${caregiver.email}`);
        } else {
            Alert.alert("Unavailable", "Email not available");
        }
    };

    const renderStars = (rating, size = 16) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={
                        i <= rating
                            ? "star"
                            : i - 0.5 <= rating
                                ? "star-half"
                                : "star-outline"
                    }
                    size={size}
                    color="#FFC107"
                />
            );
        }
        return stars;
    };

    const isApproved = caregiver.isVerified === true;

    const isPatient = user?.userType === "patient";

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hdrG}>
                <View style={styles.hdr}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Caregiver Details</Text>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {getInitials(caregiver.name)}
                            </Text>
                        </View>
                        {isApproved && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons
                                    name="checkmark-circle"
                                    size={24}
                                    color={C.success}
                                />
                            </View>
                        )}
                    </View>

                    <Text style={styles.name}>{caregiver.name}</Text>

                    {/* Rating Display */}
                    <View style={styles.ratingContainer}>
                        <View style={styles.starsRow}>{renderStars(averageRating)}</View>
                        <Text style={styles.ratingValue}>
                            {averageRating > 0 ? averageRating.toFixed(1) : "No ratings"}
                        </Text>
                        <Text style={styles.ratingCount}>
                            ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
                        </Text>
                    </View>

                    <View style={styles.typeBadge}>
                        <Ionicons name="heart-outline" size={14} color={C.secondary} />
                        <Text style={styles.typeText}>Caregiver</Text>
                    </View>

                    {isApproved ? (
                        <View style={styles.statusBadgeApproved}>
                            <Ionicons
                                name="shield-checkmark"
                                size={14}
                                color={C.success}
                            />
                            <Text style={styles.statusTextApproved}>
                                Verified Provider
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.statusBadgePending}>
                            <Ionicons name="time-outline" size={14} color={C.warning} />
                            <Text style={styles.statusTextPending}>
                                Verification Pending
                            </Text>
                        </View>
                    )}
                </View>

                {/* Details Section */}
                <View style={styles.detailsCard}>
                    <Text style={styles.sectionTitle}>Information</Text>

                    {caregiver.agencyName ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: C.lightTeal }]}>
                                <Ionicons name="business" size={18} color={C.secondary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Agency / Company</Text>
                                <Text style={styles.detailValue}>
                                    {caregiver.agencyName}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.caregivingServices ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: '#FDE8EF' }]}>
                                <Ionicons name="medkit" size={18} color="#E91E63" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Caregiving Services</Text>
                                <Text style={styles.detailValue}>
                                    {caregiver.caregivingServices}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.patientTypes ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: '#FFF0E6' }]}>
                                <Ionicons name="people" size={18} color="#FF7043" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Patient Types Considered</Text>
                                <Text style={styles.detailValue}>
                                    {caregiver.patientTypes}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.serviceLocations ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: C.lightTeal }]}>
                                <Ionicons name="map" size={18} color={C.primary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Service Locations</Text>
                                <Text style={styles.detailValue}>
                                    {caregiver.serviceLocations}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.phoneNumber ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: C.successBg }]}>
                                <Ionicons name="call" size={18} color={C.success} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Phone</Text>
                                <Text style={styles.detailValue}>
                                    {caregiver.phoneNumber}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.email ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: C.warningBg }]}>
                                <Ionicons name="mail" size={18} color={C.warning} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Email</Text>
                                <Text style={styles.detailValue}>{caregiver.email}</Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.city ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: C.lightTeal }]}>
                                <Ionicons name="location" size={18} color={C.primary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>City</Text>
                                <Text style={styles.detailValue}>{caregiver.city}</Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.aboutUs ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: C.lightTeal }]}>
                                <Ionicons name="information-circle" size={18} color={C.secondary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>About Us</Text>
                                <Text style={styles.detailValue}>{caregiver.aboutUs}</Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.operatingHours ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: C.warningBg }]}>
                                <Ionicons name="time" size={18} color={C.warning} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Operating Hours</Text>
                                <Text style={styles.detailValue}>{caregiver.operatingHours}</Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.fullAddress ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: '#F0F0F0' }]}>
                                <Ionicons name="home" size={18} color="#616161" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Full Address</Text>
                                <Text style={styles.detailValue}>{caregiver.fullAddress}</Text>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.website ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: C.lightTeal }]}>
                                <Ionicons name="globe" size={18} color={C.secondary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Website</Text>
                                <TouchableOpacity onPress={() => Linking.openURL(caregiver.website.startsWith('http') ? caregiver.website : `https://${caregiver.website}`)}>
                                    <Text style={[styles.detailValue, { color: C.secondary, textDecorationLine: 'underline' }]}>
                                        {caregiver.website}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : null}

                    {caregiver.licenseNumber ? (
                        <View style={styles.detailRow}>
                            <View style={[styles.iconCircle, { backgroundColor: C.lightTeal }]}>
                                <Ionicons name="document-text" size={18} color={C.primary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>License Number</Text>
                                <Text style={styles.detailValue}>
                                    {caregiver.licenseNumber}
                                </Text>
                            </View>
                        </View>
                    ) : null}
                </View>

                {/* Contact Buttons */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.callButton]}
                        onPress={handleCall}
                    >
                        <Ionicons name="call" size={20} color="#fff" />
                        <Text style={styles.actionText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.emailButton]}
                        onPress={handleEmail}
                    >
                        <Ionicons name="mail" size={20} color="#fff" />
                        <Text style={styles.actionText}>Email</Text>
                    </TouchableOpacity>
                </View>

                {/* Rate Button (only for patients) */}
                {isPatient && (
                    <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() =>
                            navigation.navigate("RateCaregiverScreen", {
                                caregiverId: caregiver._id,
                                caregiverName: caregiver.name,
                            })
                        }
                    >
                        <Ionicons
                            name="star"
                            size={20}
                            color="#fff"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.rateButtonText}>Rate this Caregiver</Text>
                    </TouchableOpacity>
                )}

                {/* Reviews Section */}
                <View style={styles.reviewsSection}>
                    <Text style={styles.sectionTitle}>
                        Reviews ({totalReviews})
                    </Text>

                    {loadingReviews ? (
                        <ActivityIndicator
                            size="small"
                            color={C.secondary}
                            style={{ marginTop: 16 }}
                        />
                    ) : reviews.length === 0 ? (
                        <View style={styles.emptyReviews}>
                            <Ionicons
                                name="chatbubble-ellipses-outline"
                                size={40}
                                color={C.textMuted}
                            />
                            <Text style={styles.emptyText}>No reviews yet</Text>
                        </View>
                    ) : (
                        reviews.slice(0, 5).map((review, index) => (
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
                                        <View style={styles.reviewStarsRow}>
                                            {renderStars(review.rating, 14)}
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
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 22 },
    hdr: { flexDirection: "row", alignItems: "center" },
    backButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: "center", alignItems: "center", marginRight: 16,
    },
    headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },

    content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 },

    profileCard: {
        backgroundColor: C.card, borderRadius: 22, padding: 28, alignItems: "center",
        marginBottom: 18, elevation: 4, shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    avatarContainer: { position: "relative", marginBottom: 16 },
    avatar: {
        width: 90, height: 90, borderRadius: 45, backgroundColor: C.secondary,
        justifyContent: "center", alignItems: "center",
    },
    avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
    verifiedBadge: {
        position: "absolute", bottom: 0, right: -2, backgroundColor: "#fff",
        borderRadius: 14, padding: 2,
    },
    name: { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 8 },

    ratingContainer: {
        flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 6,
    },
    starsRow: { flexDirection: "row" },
    ratingValue: { fontSize: 15, fontWeight: "700", color: C.text },
    ratingCount: { fontSize: 13, color: C.textSecondary },

    typeBadge: {
        flexDirection: "row", alignItems: "center", backgroundColor: C.lightTeal,
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 10,
    },
    typeText: { color: C.secondary, fontSize: 13, fontWeight: "700", marginLeft: 5 },
    statusBadgeApproved: {
        flexDirection: "row", alignItems: "center", backgroundColor: C.successBg,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
    },
    statusTextApproved: { color: C.success, fontSize: 12, fontWeight: "600", marginLeft: 4 },
    statusBadgePending: {
        flexDirection: "row", alignItems: "center", backgroundColor: C.warningBg,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
    },
    statusTextPending: { color: C.warning, fontSize: 12, fontWeight: "600", marginLeft: 4 },

    detailsCard: {
        backgroundColor: C.card, borderRadius: 22, padding: 22, marginBottom: 18,
        elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder,
    },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: C.text, marginBottom: 18 },
    detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
    iconCircle: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: C.lightTeal,
        justifyContent: "center", alignItems: "center", marginRight: 14,
    },
    detailContent: { flex: 1 },
    detailLabel: { fontSize: 12, color: C.textSecondary, fontWeight: "600", marginBottom: 2 },
    detailValue: { fontSize: 15, color: C.text, fontWeight: "600" },

    actionContainer: { flexDirection: "row", gap: 14, marginBottom: 14 },
    actionButton: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        paddingVertical: 16, borderRadius: 16, elevation: 3,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6,
    },
    callButton: { backgroundColor: C.success },
    emailButton: { backgroundColor: C.secondary },
    actionText: { color: "#fff", fontSize: 16, fontWeight: "700", marginLeft: 8 },

    rateButton: {
        flexDirection: "row", backgroundColor: C.primary, padding: 16, borderRadius: 16,
        alignItems: "center", justifyContent: "center", marginBottom: 18,
        elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8,
    },
    rateButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    reviewsSection: {
        backgroundColor: C.card, borderRadius: 22, padding: 22, marginBottom: 18,
        elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder,
    },
    emptyReviews: { alignItems: "center", paddingVertical: 24 },
    emptyText: { fontSize: 14, color: C.textSecondary, marginTop: 8 },

    reviewCard: {
        backgroundColor: C.lightTeal, borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    reviewHeader: { flexDirection: "row", alignItems: "center" },
    reviewAvatar: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: C.secondary,
        justifyContent: "center", alignItems: "center", marginRight: 10,
    },
    reviewAvatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    reviewUserName: { fontSize: 13, fontWeight: "700", color: C.text },
    reviewStarsRow: { flexDirection: "row", marginTop: 2 },
    reviewDate: { fontSize: 11, color: C.textMuted },
    reviewComment: { fontSize: 13, color: C.textSecondary, marginTop: 10, lineHeight: 19 },
});
