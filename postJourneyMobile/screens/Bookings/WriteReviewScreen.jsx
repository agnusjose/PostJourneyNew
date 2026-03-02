import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

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

export default function WriteReviewScreen({ navigation, route }) {
    const { booking } = route.params;
    const { user } = useAuth();

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const BASE_URL = "http://172.16.230.150:5000";

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert("Rating Required", "Please select a star rating");
            return;
        }

        setSubmitting(true);

        try {
            const equipmentId = booking.equipmentId?._id || booking.equipmentId;

            const response = await axios.post(
                `${BASE_URL}/equipment/${equipmentId}/review`,
                {
                    userId: user.userId,
                    userName: user.name,
                    rating,
                    comment: comment.trim(),
                    bookingId: booking._id,
                }
            );

            if (response.data.success) {
                Alert.alert(
                    "Thank You!",
                    "Your review has been submitted successfully",
                    [
                        {
                            text: "OK",
                            onPress: () => navigation.goBack(),
                        },
                    ]
                );
            } else {
                Alert.alert("Error", response.data.message || "Failed to submit review");
            }
        } catch (error) {
            console.error("Error submitting review:", error);
            Alert.alert("Error", "Failed to submit review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = () => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <TouchableOpacity
                    key={i}
                    onPress={() => setRating(i)}
                    style={styles.starButton}
                >
                    <Ionicons
                        name={i <= rating ? "star" : "star-outline"}
                        size={40}
                        color={i <= rating ? C.gold : C.textMuted}
                    />
                </TouchableOpacity>
            );
        }
        return stars;
    };

    const getRatingText = () => {
        switch (rating) {
            case 1: return "Poor";
            case 2: return "Fair";
            case 3: return "Good";
            case 4: return "Very Good";
            case 5: return "Excellent";
            default: return "Tap to rate";
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />

            {/* Gradient Header */}
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.headerGradient}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Write Review</Text>
                    <View style={styles.placeholder} />
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Equipment Info */}
                    <View style={styles.equipmentCard}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="medkit-outline" size={32} color={C.secondary} />
                        </View>
                        <View style={styles.equipmentInfo}>
                            <Text style={styles.equipmentName}>
                                {booking.equipmentName || "Equipment"}
                            </Text>
                            <Text style={styles.providerName}>
                                Provider: {booking.providerName || "N/A"}
                            </Text>
                        </View>
                    </View>

                    {/* Rating Section */}
                    <View style={styles.ratingSection}>
                        <Text style={styles.sectionTitle}>Rate your experience</Text>
                        <View style={styles.starsContainer}>{renderStars()}</View>
                        <Text
                            style={[
                                styles.ratingText,
                                rating > 0 && styles.ratingTextActive,
                            ]}
                        >
                            {getRatingText()}
                        </Text>
                    </View>

                    {/* Comment Section */}
                    <View style={styles.commentSection}>
                        <Text style={styles.sectionTitle}>Write your review (optional)</Text>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Share your experience with this equipment..."
                            placeholderTextColor={C.textMuted}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                            value={comment}
                            onChangeText={setComment}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>{comment.length}/500</Text>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            rating === 0 && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={submitting || rating === 0}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <LinearGradient
                                colors={rating === 0 ? [C.textMuted, C.textMuted] : [C.primary, C.secondary]}
                                style={styles.submitGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="send" size={20} color="#fff" />
                                <Text style={styles.submitButtonText}>Submit Review</Text>
                            </LinearGradient>
                        )}
                    </TouchableOpacity>

                    <View style={styles.bottomPadding} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    headerGradient: {
        paddingTop: 50,
        paddingBottom: 18,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#fff",
        letterSpacing: -0.3,
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    equipmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.card,
        padding: 20,
        borderRadius: 18,
        marginBottom: 20,
        elevation: 3,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: C.cardBorder,
    },
    iconContainer: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: C.lightTeal,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    equipmentInfo: {
        flex: 1,
    },
    equipmentName: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
        marginBottom: 4,
    },
    providerName: {
        fontSize: 14,
        color: C.textSecondary,
        fontWeight: "500",
    },
    ratingSection: {
        backgroundColor: C.card,
        padding: 24,
        borderRadius: 18,
        marginBottom: 20,
        alignItems: "center",
        elevation: 3,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: C.cardBorder,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
        marginBottom: 20,
        alignSelf: "flex-start",
    },
    starsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 16,
        gap: 8,
    },
    starButton: {
        paddingHorizontal: 4,
    },
    ratingText: {
        fontSize: 18,
        color: C.textMuted,
        fontWeight: "600",
        marginTop: 8,
    },
    ratingTextActive: {
        color: C.secondary,
        fontWeight: "700",
    },
    commentSection: {
        backgroundColor: C.card,
        padding: 20,
        borderRadius: 18,
        marginBottom: 20,
        elevation: 3,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: C.cardBorder,
    },
    commentInput: {
        borderWidth: 1,
        borderColor: C.cardBorder,
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        color: C.text,
        minHeight: 120,
        backgroundColor: C.bg,
        textAlignVertical: "top",
    },
    charCount: {
        fontSize: 12,
        color: C.textMuted,
        textAlign: "right",
        marginTop: 8,
    },
    submitButton: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    submitButtonDisabled: {
        shadowOpacity: 0,
        elevation: 0,
    },
    submitGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        gap: 10,
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    bottomPadding: {
        height: 40,
    },
});
