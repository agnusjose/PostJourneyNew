import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    StatusBar,
    ScrollView,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const BASE_URL = "http://172.16.230.150:5000";

export default function RateCaregiverScreen({ route, navigation }) {
    const { caregiverId, caregiverName } = route.params;
    const { user } = useAuth();

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert("Error", "Please select a rating");
            return;
        }

        if (!user?.userId) {
            Alert.alert("Error", "Please login to submit a review");
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post(
                `${BASE_URL}/api/caregiver/${caregiverId}/review`,
                {
                    userId: user.userId,
                    userName: user.name || user.userName || "Patient",
                    rating,
                    comment,
                }
            );

            if (res.data.success) {
                Alert.alert("Thank You!", "Your review has been submitted.", [
                    { text: "OK", onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert("Error", res.data.message || "Failed to submit review");
            }
        } catch (err) {
            console.error("Error submitting review:", err);
            Alert.alert("Error", "Failed to submit review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ImageBackground
            source={require("../assets/pjlogo_bg.png")}
            style={styles.bg}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <StatusBar barStyle="dark-content" />

                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#0A3D52" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Rate Caregiver</Text>
                    </View>

                    {/* Caregiver Info */}
                    <View style={styles.caregiverCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(caregiverName || "?").charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.caregiverName}>{caregiverName}</Text>
                        <Text style={styles.subtitle}>How was your experience?</Text>
                    </View>

                    {/* Star Rating */}
                    <View style={styles.ratingCard}>
                        <Text style={styles.ratingLabel}>Tap to rate</Text>
                        <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setRating(star)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={star <= rating ? "star" : "star-outline"}
                                        size={44}
                                        color={star <= rating ? "#FFC107" : "#CFD8DC"}
                                        style={{ marginHorizontal: 4 }}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.ratingText}>
                            {rating === 0
                                ? ""
                                : rating === 1
                                    ? "Poor"
                                    : rating === 2
                                        ? "Fair"
                                        : rating === 3
                                            ? "Good"
                                            : rating === 4
                                                ? "Very Good"
                                                : "Excellent"}
                        </Text>
                    </View>

                    {/* Comment */}
                    <View style={styles.commentCard}>
                        <Text style={styles.commentLabel}>
                            Write a review (optional)
                        </Text>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Share your experience with this caregiver..."
                            placeholderTextColor="#90A4AE"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={comment}
                            onChangeText={setComment}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>{comment.length}/500</Text>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (rating === 0 || submitting) && styles.submitDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={rating === 0 || submitting}
                    >
                        <Ionicons
                            name="send"
                            size={18}
                            color="#fff"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.submitText}>
                            {submitting ? "Submitting..." : "Submit Review"}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    overlay: { flex: 1, backgroundColor: "rgba(245, 250, 255, 0.85)" },

    content: { paddingHorizontal: 22, paddingTop: 60, paddingBottom: 40 },

    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 28,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#0A3D52",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0A3D52",
        letterSpacing: -0.5,
    },

    caregiverCard: {
        backgroundColor: "#fff",
        borderRadius: 22,
        padding: 28,
        alignItems: "center",
        marginBottom: 20,
        elevation: 3,
        shadowColor: "#0A3D52",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: "#D7E5ED",
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#0A5F7A",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
    caregiverName: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0A3D52",
        marginBottom: 4,
    },
    subtitle: { fontSize: 14, color: "#4A7A8C" },

    ratingCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        marginBottom: 20,
        elevation: 3,
        shadowColor: "#0A3D52",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: "#D7E5ED",
    },
    ratingLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#4A7A8C",
        marginBottom: 16,
    },
    starsContainer: { flexDirection: "row", marginBottom: 10 },
    ratingText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0A5F7A",
        marginTop: 4,
    },

    commentCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 22,
        marginBottom: 24,
        elevation: 3,
        shadowColor: "#0A3D52",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: "#D7E5ED",
    },
    commentLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0A3D52",
        marginBottom: 12,
    },
    commentInput: {
        borderWidth: 1,
        borderColor: "#E1E8ED",
        borderRadius: 14,
        padding: 14,
        fontSize: 14,
        color: "#0A3D52",
        backgroundColor: "#F8FAFC",
        minHeight: 100,
    },
    charCount: {
        fontSize: 12,
        color: "#90A4AE",
        textAlign: "right",
        marginTop: 6,
    },

    submitButton: {
        flexDirection: "row",
        backgroundColor: "#0A5F7A",
        padding: 18,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
        shadowColor: "#0A5F7A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    submitDisabled: { backgroundColor: "#94a3b8" },
    submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
