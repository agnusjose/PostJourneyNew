import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Platform,
    Image,
    Modal,
    Linking,
    StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
    bg: "#F0F6F9", surface: "#FFFFFF",
    textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8",
    cardBorder: "#DBE8EE", success: "#10B981", danger: "#EF4444", warning: "#F59E0B",
};

export default function AdminUserDetailsScreen({ route, navigation }) {
    const { userId, userType } = route.params;
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [relatedData, setRelatedData] = useState(null);
    const [error, setError] = useState(null);
    const [selectedSale, setSelectedSale] = useState(null);
    const [saleModalVisible, setSaleModalVisible] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);
    const [documentModalVisible, setDocumentModalVisible] = useState(false);

    const BASE_URL = Platform.OS === "web"
        ? "http://localhost:5000"
        : "http://192.168.172.72:5000";

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${BASE_URL}/admin/users/${userId}/details`);

            if (response.data.success) {
                setUser(response.data.user);
                setRelatedData(response.data.relatedData);

                // Debug: Log document URL construction
                const docUrl = response.data.user?.providerProfile?.verification?.documentUrl;
                console.log("📄 Raw documentUrl from DB:", docUrl);
                if (docUrl) {
                    // Normalize URL: extract path and use current BASE_URL
                    let imageUrl = docUrl;
                    if (docUrl.startsWith("http") && !docUrl.startsWith(BASE_URL)) {
                        // Old IP detected, extract path and use current BASE_URL
                        const urlPath = docUrl.replace(/^https?:\/\/[^/]+/, "");
                        imageUrl = `${BASE_URL}${urlPath}`;
                    } else if (!docUrl.startsWith("http")) {
                        imageUrl = `${BASE_URL}${docUrl.startsWith("/") ? "" : "/"}${docUrl}`;
                    }
                    console.log("🖼️ Constructed Image URL:", imageUrl);
                }
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            console.error("Error fetching user details:", err);
            setError("Failed to load user details");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyProvider = async (status) => {
        let reason = "";
        if (status === "rejected") {
            // Simple approach for now: prompt for reason
            // In a real app, you'd use a dedicated text input modal
            reason = "License document is unclear or invalid.";
        }

        try {
            const response = await axios.patch(`${BASE_URL}/admin/verify-provider`, {
                userId: userId,
                status: status,
                disapprovalReason: reason
            });

            if (response.data.success) {
                Alert.alert("Success", `Provider has been ${status}`);
                fetchUserDetails(); // Refresh data
            } else {
                Alert.alert("Error", response.data.message);
            }
        } catch (err) {
            console.error("Verification error:", err);
            Alert.alert("Error", "Failed to update verification status");
        } finally {
            // No verifying state to reset
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };

    const formatCurrency = (amount) => {
        return "₹" + (amount || 0).toLocaleString();
    };

    // Helper: Normalize document URL (handles old IPs stored in DB)
    const normalizeDocUrl = (docUrl) => {
        if (!docUrl) return null;
        if (docUrl.startsWith("http") && !docUrl.startsWith(BASE_URL)) {
            // Extract path from old URL and use current BASE_URL
            const urlPath = docUrl.replace(/^https?:\/\/[^/]+/, "");
            return `${BASE_URL}${urlPath}`;
        } else if (!docUrl.startsWith("http")) {
            return `${BASE_URL}${docUrl.startsWith("/") ? "" : "/"}${docUrl}`;
        }
        return docUrl;
    };

    const isImageFile = (url) => {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return (
            lowerUrl.endsWith(".jpg") ||
            lowerUrl.endsWith(".jpeg") ||
            lowerUrl.endsWith(".png") ||
            lowerUrl.endsWith(".gif")
        );
    };

    const handleViewDocument = async (url) => {
        const fullUrl = normalizeDocUrl(url);
        try {
            await Linking.openURL(fullUrl);
        } catch (err) {
            console.error("Linking error:", err);
            Alert.alert("Error", "Could not open document link.");
        }
    };

    const openSaleDetail = (sale) => {
        setSelectedSale(sale);
        setSaleModalVisible(true);
    };

    const openEquipmentDetail = (eq) => {
        setSelectedEquipment(eq);
        setEquipmentModalVisible(true);
    };

    const renderEquipmentDetailModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={equipmentModalVisible}
            onRequestClose={() => setEquipmentModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Equipment Details</Text>
                            <TouchableOpacity
                                onPress={() => setEquipmentModalVisible(false)}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {selectedEquipment && (
                            <>
                                {/* Equipment Image */}
                                {selectedEquipment.imageUrl ? (
                                    <Image
                                        source={{ uri: selectedEquipment.imageUrl.startsWith('http') ? selectedEquipment.imageUrl : `${BASE_URL}${selectedEquipment.imageUrl}` }}
                                        style={{ width: '100%', height: 250, borderRadius: 12, marginBottom: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0f0f0' }}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View style={{ width: '100%', height: 250, borderRadius: 12, marginBottom: 16, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' }}>
                                        <MaterialCommunityIcons name="package-variant" size={50} color="#ccc" />
                                        <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>No image</Text>
                                    </View>
                                )}

                                {/* Basic Info */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>📦 Product Info</Text>
                                    <View style={styles.modalCard}>
                                        <Text style={styles.modalItemName}>{selectedEquipment.equipmentName}</Text>
                                        <InfoRow label="Category" value={selectedEquipment.category || "N/A"} />
                                        <InfoRow label="Price/Day" value={formatCurrency(selectedEquipment.pricePerDay)} />
                                        <InfoRow label="Stock" value={String(selectedEquipment.stock)} />
                                        <InfoRow label="Available" value={selectedEquipment.isAvailable ? "Yes" : "No"} />
                                        {selectedEquipment.description ? <InfoRow label="Description" value={selectedEquipment.description} /> : null}
                                    </View>
                                </View>

                                {/* Listing Info */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>📋 Listing Status</Text>
                                    <View style={styles.modalCard}>
                                        <InfoRow label="Listed" value={selectedEquipment.isListed ? "Yes" : "No"} />
                                        <InfoRow label="Listing Fee Paid" value={selectedEquipment.listingFeePaid ? "Yes" : "No"} />
                                        {selectedEquipment.listingFeeAmount > 0 && (
                                            <InfoRow label="Fee Amount" value={formatCurrency(selectedEquipment.listingFeeAmount)} />
                                        )}
                                        <InfoRow label="Admin Approved" value={selectedEquipment.adminApproved ? "Yes" : "No"} />
                                    </View>
                                </View>

                                {/* Ratings Summary */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>⭐ Ratings & Reviews</Text>
                                    <View style={styles.modalCard}>
                                        <View style={{ alignItems: 'center', marginBottom: 12 }}>
                                            <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFC107' }}>
                                                {selectedEquipment.averageRating?.toFixed(1) || "0.0"}
                                            </Text>
                                            <Text style={{ color: '#FFC107', fontSize: 18 }}>
                                                {"★".repeat(Math.round(selectedEquipment.averageRating || 0))}{"☆".repeat(5 - Math.round(selectedEquipment.averageRating || 0))}
                                            </Text>
                                            <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                                                {selectedEquipment.totalReviews || selectedEquipment.reviews?.length || 0} review(s)
                                            </Text>
                                        </View>

                                        {selectedEquipment.reviews?.length > 0 ? (
                                            selectedEquipment.reviews.map((r, ri) => (
                                                <View key={ri} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>{r.userName || "Patient"}</Text>
                                                        <Text style={{ color: '#FFC107', fontSize: 13, fontWeight: '700' }}>
                                                            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                                                        </Text>
                                                    </View>
                                                    {r.comment ? (
                                                        <Text style={{ fontSize: 13, color: '#666', fontStyle: 'italic', marginTop: 4 }}>
                                                            "{r.comment}"
                                                        </Text>
                                                    ) : null}
                                                    <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{formatDate(r.date)}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={{ textAlign: 'center', color: '#999', fontSize: 13 }}>No reviews yet</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Timestamps */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>🕐 Timestamps</Text>
                                    <View style={styles.modalCard}>
                                        <InfoRow label="Created" value={formatDate(selectedEquipment.createdAt)} />
                                        <InfoRow label="Last Updated" value={formatDate(selectedEquipment.updatedAt)} />
                                    </View>
                                </View>

                                {/* Equipment ID */}
                                <View style={styles.bookingIdContainer}>
                                    <Text style={styles.bookingIdLabel}>Equipment ID:</Text>
                                    <Text style={styles.bookingIdText}>{selectedEquipment._id}</Text>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderSaleDetailModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={saleModalVisible}
            onRequestClose={() => setSaleModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Purchase Details</Text>
                            <TouchableOpacity
                                onPress={() => setSaleModalVisible(false)}
                                style={styles.closeBtn}
                            >
                                <Text style={styles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {selectedSale && (
                            <>
                                {/* Equipment Info */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>📦 Equipment</Text>
                                    <View style={styles.modalCard}>
                                        <Text style={styles.modalItemName}>{selectedSale.equipmentName}</Text>
                                        <InfoRow label="Category" value={selectedSale.category || "N/A"} />
                                        <InfoRow label="Quantity" value={selectedSale.quantity || 1} />
                                        <InfoRow label="Price/Day" value={formatCurrency(selectedSale.pricePerDay)} />
                                    </View>
                                </View>

                                {/* Customer/Provider Info */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>
                                        {isProvider ? "👤 Customer" : "🏪 Provider"}
                                    </Text>
                                    <View style={styles.modalCard}>
                                        <InfoRow
                                            label="Name"
                                            value={isProvider ? selectedSale.patientName : selectedSale.providerName}
                                        />
                                        <InfoRow
                                            label="Email"
                                            value={isProvider
                                                ? (selectedSale.patientEmail || "N/A")
                                                : (selectedSale.providerEmail || "N/A")
                                            }
                                        />
                                        <InfoRow
                                            label="Phone"
                                            value={isProvider
                                                ? (selectedSale.patientPhone || selectedSale.contactPhone || "N/A")
                                                : (selectedSale.providerPhone || "N/A")
                                            }
                                        />
                                    </View>
                                </View>

                                {/* Booking Dates */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>📅 Booking Period</Text>
                                    <View style={styles.modalCard}>
                                        <InfoRow label="Start Date" value={formatDate(selectedSale.startDate)} />
                                        <InfoRow label="End Date" value={formatDate(selectedSale.endDate)} />
                                        <InfoRow label="Total Days" value={selectedSale.totalDays || "N/A"} />
                                    </View>
                                </View>

                                {/* Payment Info */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>💰 Payment Details</Text>
                                    <View style={styles.modalCard}>
                                        <InfoRow label="Total Amount" value={formatCurrency(selectedSale.totalAmount)} />
                                        <InfoRow label="Payment Method" value={selectedSale.paymentMethod || "N/A"} />
                                        <InfoRow label="Payment Status" value={selectedSale.paymentStatus || "N/A"} />
                                        <InfoRow label="Booking Status" value={selectedSale.status || "N/A"} />
                                    </View>
                                </View>

                                {/* Delivery Address & Contact */}
                                {(selectedSale.deliveryAddress || selectedSale.contactPhone) && (
                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>📍 Delivery Info</Text>
                                        <View style={styles.modalCard}>
                                            {selectedSale.deliveryAddress && (
                                                <InfoRow label="Address" value={selectedSale.deliveryAddress} />
                                            )}
                                            {selectedSale.contactPhone && (
                                                <InfoRow label="Contact Phone" value={selectedSale.contactPhone} />
                                            )}
                                        </View>
                                    </View>
                                )}

                                {/* Notes */}
                                {selectedSale.notes ? (
                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>📝 Notes</Text>
                                        <View style={styles.modalCard}>
                                            <Text style={styles.addressText}>{selectedSale.notes}</Text>
                                        </View>
                                    </View>
                                ) : null}

                                {/* Cancellation Info */}
                                {selectedSale.status === "cancelled" && (
                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>❌ Cancellation</Text>
                                        <View style={[styles.modalCard, styles.cancelCard]}>
                                            {selectedSale.cancelledBy && (
                                                <InfoRow label="Cancelled By" value={selectedSale.cancelledBy} />
                                            )}
                                            {selectedSale.cancellationReason && (
                                                <InfoRow label="Reason" value={selectedSale.cancellationReason} />
                                            )}
                                        </View>
                                    </View>
                                )}

                                {/* Review */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>⭐ Review</Text>
                                    <View style={styles.modalCard}>
                                        {selectedSale.hasReview && selectedSale.review ? (
                                            <>
                                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                                                    <Text style={{ color: "#FFC107", fontSize: 18, fontWeight: "700", marginRight: 8 }}>
                                                        {"★".repeat(selectedSale.review.rating || 0)}{"☆".repeat(5 - (selectedSale.review.rating || 0))}
                                                    </Text>
                                                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#333" }}>
                                                        {selectedSale.review.rating}/5
                                                    </Text>
                                                </View>
                                                {selectedSale.review.comment ? (
                                                    <Text style={{ fontSize: 13, color: "#666", fontStyle: "italic", marginBottom: 6 }}>
                                                        "{selectedSale.review.comment}"
                                                    </Text>
                                                ) : null}
                                                {selectedSale.review.reviewDate ? (
                                                    <Text style={{ fontSize: 11, color: "#999" }}>
                                                        Reviewed on {formatDate(selectedSale.review.reviewDate)}
                                                    </Text>
                                                ) : null}
                                            </>
                                        ) : (
                                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                                <MaterialCommunityIcons name="star-off-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                                                <Text style={{ fontSize: 13, color: "#999" }}>No review yet</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Timestamps */}
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>🕐 Timestamps</Text>
                                    <View style={styles.modalCard}>
                                        <InfoRow label="Created" value={formatDate(selectedSale.createdAt)} />
                                        <InfoRow label="Last Updated" value={formatDate(selectedSale.updatedAt)} />
                                    </View>
                                </View>

                                {/* Booking ID */}
                                <View style={styles.bookingIdContainer}>
                                    <Text style={styles.bookingIdLabel}>Booking ID:</Text>
                                    <Text style={styles.bookingIdText}>{selectedSale._id}</Text>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" backgroundColor={C.primary} />
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={styles.loadingText}>Loading user details...</Text>
            </View>
        );
    }

    if (error || !user) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" backgroundColor={C.primary} />
                <MaterialCommunityIcons name="alert-circle-outline" size={44} color={C.danger} />
                <Text style={styles.errorText}>{error || "User not found"}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchUserDetails}>
                    <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isProvider = user.userType === "service-provider" || user.userType === "service provider";
    const isDoctor = user.userType === "doctor";
    const isPatient = user.userType === "patient";
    const isEquipmentProvider = isProvider && user.providerProfile?.serviceType === "equipment";
    const isCaregiver = isProvider && user.providerProfile?.serviceType === "caregiver";

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />

            {/* Profile Hero */}
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.profileHero}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                    </Text>
                </View>
                <Text style={styles.userName}>{user.name || "No Name"}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{user.userType}</Text>
                </View>
            </LinearGradient>

            {/* Profile Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Information</Text>
                <View style={styles.infoCard}>
                    <InfoRow label="Phone" value={user.phoneNumber || "N/A"} />
                    <InfoRow label="City" value={user.city || "N/A"} />
                    {isProvider ? (
                        <>
                            <InfoRow label="Agency Name" value={user.providerProfile?.agencyName || "N/A"} />
                            <InfoRow label="Service Type" value={user.providerProfile?.serviceType || "N/A"} />
                            <InfoRow label="License No." value={user.providerProfile?.licenseNumber || "N/A"} />
                            {isCaregiver ? (
                                <>
                                    <InfoRow label="Caregiving Services" value={user.providerProfile?.caregivingServices || "N/A"} />
                                    <InfoRow label="Patient Types" value={user.providerProfile?.patientTypes || "N/A"} />
                                    <InfoRow label="Service Locations" value={user.providerProfile?.serviceLocations || "N/A"} />
                                </>
                            ) : null}
                            <InfoRow label="Full Address" value={user.providerProfile?.fullAddress || "N/A"} />
                            <InfoRow label="Operating Hours" value={user.providerProfile?.operatingHours || "N/A"} />
                            <InfoRow label="About Us" value={user.providerProfile?.aboutUs || "N/A"} />
                            <InfoRow label="Website" value={user.providerProfile?.website || "N/A"} />
                            <InfoRow label="Verification" value={user.providerProfile?.verification?.status?.toUpperCase() || "PENDING"} />
                        </>
                    ) : isDoctor ? (
                        <>
                            <InfoRow label="Specialization" value={user.specialization || "N/A"} />
                            <InfoRow label="Experience" value={user.experience || "N/A"} />
                            <InfoRow label="Qualification" value={user.qualification || "N/A"} />
                            <InfoRow label="Languages" value={user.languages || "N/A"} />
                            <InfoRow label="Consultation Fee" value={user.consultationFee ? `₹${user.consultationFee}` : "N/A"} />
                            <InfoRow label="About" value={user.about || "N/A"} />
                        </>
                    ) : (
                        <>
                            <InfoRow label="Age" value={user.patientProfile?.age || "N/A"} />
                            <InfoRow label="Gender" value={user.patientProfile?.gender || "N/A"} />
                            <InfoRow label="Blood Group" value={user.patientProfile?.bloodGroup || "N/A"} />
                            <InfoRow label="Height" value={user.patientProfile?.height || "N/A"} />
                            <InfoRow label="Weight" value={user.patientProfile?.weight || "N/A"} />
                            <InfoRow label="Primary Condition" value={user.patientProfile?.primaryCondition || "N/A"} />
                            <InfoRow label="Primary Goal" value={user.patientProfile?.primaryGoal || "N/A"} />
                            <InfoRow label="Activity Level" value={user.patientProfile?.activityLevel || "N/A"} />
                            <InfoRow label="Medical History" value={user.patientProfile?.medicalHistory || "N/A"} />
                            <InfoRow label="Surgery History" value={user.patientProfile?.surgeryHistory || "N/A"} />
                            <InfoRow label="Current Medications" value={user.patientProfile?.currentMedications || "N/A"} />
                            <InfoRow label="Emergency Contact" value={user.patientProfile?.emergencyContact || "N/A"} />
                            <InfoRow label="Sleep Hours" value={user.patientProfile?.sleepHours || "N/A"} />
                            <InfoRow label="Smoking" value={user.patientProfile?.smokingHabit ? "Yes" : "No"} />
                            <InfoRow label="Alcohol" value={user.patientProfile?.alcoholConsumption || "N/A"} />
                        </>
                    )}
                    <InfoRow label="Registered" value={formatDate(user.createdAt)} />
                    <InfoRow label="Verified" value={user.isVerified ? "Yes" : "No"} />
                    <InfoRow label="Blocked" value={user.isBlocked ? "Yes" : "No"} />
                </View>
            </View>

            {/* Provider Verification Documents */}
            {isProvider && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Verification Documents</Text>
                    <View style={styles.infoCard}>
                        {user.providerProfile?.verification?.documentUrl ? (
                            <View style={styles.documentPreviewContainer}>
                                {isImageFile(user.providerProfile.verification.documentUrl) ? (
                                    <TouchableOpacity
                                        onPress={() => setDocumentModalVisible(true)}
                                        activeOpacity={0.8}
                                    >
                                        <Image
                                            source={{ uri: normalizeDocUrl(user.providerProfile.verification.documentUrl) }}
                                            style={styles.documentImage}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.zoomOverlay}>
                                            <MaterialCommunityIcons name="magnify-plus" size={24} color="white" />
                                            <Text style={styles.zoomText}>Tap to enlarge</Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.documentFilePreview}>
                                        <MaterialCommunityIcons
                                            name={user.providerProfile.verification.documentUrl.toLowerCase().endsWith(".pdf") ? "file-pdf-box" : "file-word-box"}
                                            size={60}
                                            color="#ef4444"
                                        />
                                        <TouchableOpacity
                                            style={styles.viewDocBtn}
                                            onPress={() => handleViewDocument(user.providerProfile.verification.documentUrl)}
                                        >
                                            <Text style={styles.viewDocBtnText}>View Document</Text>
                                            <MaterialCommunityIcons name="open-in-new" size={16} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.noDocumentContainer}>
                                <MaterialCommunityIcons name="file-alert-outline" size={40} color="#94a3b8" />
                                <Text style={styles.noDocumentText}>No verification document uploaded</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Document Full View Modal */}
            <Modal
                visible={documentModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDocumentModalVisible(false)}
            >
                <View style={styles.fullImageOverlay}>
                    <TouchableOpacity
                        style={styles.closeFullImage}
                        onPress={() => setDocumentModalVisible(false)}
                    >
                        <MaterialCommunityIcons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {user?.providerProfile?.verification?.documentUrl && (
                        <Image
                            source={{ uri: normalizeDocUrl(user.providerProfile?.verification?.documentUrl) }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Provider-specific data */}
            {isProvider && relatedData && (
                <>
                    {/* Stats - only show equipment/sales stats for equipment providers */}
                    {isEquipmentProvider && (
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{relatedData.totalEquipment || 0}</Text>
                                <Text style={styles.statLabel}>Equipment</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{relatedData.totalSales || 0}</Text>
                                <Text style={styles.statLabel}>Sales</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{formatCurrency(relatedData.totalEarnings)}</Text>
                                <Text style={styles.statLabel}>Earnings</Text>
                            </View>
                        </View>
                    )}

                    {/* Caregiver stats */}
                    {isCaregiver && (
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{user.providerProfile?.serviceType || "Caregiver"}</Text>
                                <Text style={styles.statLabel}>Service Type</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{relatedData.caregiverReviews?.length || 0}</Text>
                                <Text style={styles.statLabel}>Reviews</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>
                                    {relatedData.caregiverReviews?.length > 0
                                        ? (relatedData.caregiverReviews.reduce((sum, r) => sum + r.rating, 0) / relatedData.caregiverReviews.length).toFixed(1)
                                        : "—"}
                                </Text>
                                <Text style={styles.statLabel}>Avg Rating</Text>
                            </View>
                        </View>
                    )}

                    {/* Caregiver Reviews */}
                    {isCaregiver && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Patient Reviews ({relatedData.caregiverReviews?.length || 0})</Text>
                            {relatedData.caregiverReviews?.length > 0 ? (
                                relatedData.caregiverReviews.map((review, index) => (
                                    <View key={review._id || index} style={styles.itemCard}>
                                        <View style={styles.row}>
                                            <Text style={styles.itemName}>{review.userName}</Text>
                                            <Text style={{ color: "#FFC107", fontSize: 14, fontWeight: "700" }}>
                                                {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                                            </Text>
                                        </View>
                                        {review.comment ? (
                                            <Text style={styles.itemDetail}>"{review.comment}"</Text>
                                        ) : null}
                                        <Text style={styles.itemDate}>{formatDate(review.date)}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No reviews yet</Text>
                            )}
                        </View>
                    )}

                    {/* Equipment List - only for equipment providers */}
                    {isEquipmentProvider && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Equipment Added ({relatedData.equipment?.length || 0})</Text>
                            {relatedData.equipment?.length > 0 ? (
                                relatedData.equipment.map((eq, index) => (
                                    <TouchableOpacity
                                        key={eq._id || index}
                                        style={styles.clickableItemCard}
                                        onPress={() => openEquipmentDetail(eq)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.itemContent}>
                                            <Text style={styles.itemName}>{eq.equipmentName}</Text>
                                            <Text style={styles.itemDetail}>Price: {formatCurrency(eq.pricePerDay)}/day | Stock: {eq.stock}</Text>
                                            <Text style={styles.itemDetail}>Category: {eq.category} | {eq.isAvailable ? "Available" : "Unavailable"}</Text>
                                            {eq.reviews?.length > 0 && (
                                                <Text style={{ fontSize: 12, color: "#FFC107", fontWeight: "600", marginTop: 2 }}>
                                                    {"★".repeat(Math.round(eq.averageRating || 0))}{"☆".repeat(5 - Math.round(eq.averageRating || 0))} ({eq.reviews.length} reviews)
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.chevronContainer}>
                                            <Text style={styles.chevronText}>›</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No equipment added</Text>
                            )}
                        </View>
                    )}

                    {/* Sales/Bookings - only for equipment providers */}
                    {isEquipmentProvider && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Sales History ({relatedData.sales?.length || 0})</Text>
                            {relatedData.sales?.length > 0 ? (
                                relatedData.sales.map((sale, index) => (
                                    <TouchableOpacity
                                        key={sale._id || index}
                                        style={styles.clickableItemCard}
                                        onPress={() => openSaleDetail(sale)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.itemContent}>
                                            <Text style={styles.itemName}>{sale.equipmentName}</Text>
                                            <Text style={styles.itemDetail}>Purchased by: {sale.patientName}</Text>
                                            <Text style={styles.itemDetail}>Amount: {formatCurrency(sale.totalAmount)}</Text>
                                            <Text style={styles.itemDetail}>Status: {sale.status} | Payment: {sale.paymentStatus}</Text>
                                            {sale.hasReview && sale.review ? (
                                                <Text style={{ fontSize: 12, color: "#FFC107", fontWeight: "600", marginTop: 2 }}>
                                                    {"★".repeat(sale.review.rating || 0)}{"☆".repeat(5 - (sale.review.rating || 0))} — Reviewed
                                                </Text>
                                            ) : null}
                                            <Text style={styles.itemDate}>{formatDate(sale.createdAt)}</Text>
                                        </View>
                                        <View style={styles.chevronContainer}>
                                            <Text style={styles.chevronText}>›</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No sales yet</Text>
                            )}
                        </View>
                    )}
                </>
            )}

            {/* Doctor-specific data */}
            {isDoctor && relatedData && (
                <>
                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{relatedData.totalConsultations || 0}</Text>
                            <Text style={styles.statLabel}>Sessions</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{formatCurrency(relatedData.totalEarnings)}</Text>
                            <Text style={styles.statLabel}>Earnings</Text>
                        </View>
                    </View>

                    {/* Consultation History */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Consultation History ({relatedData.consultations?.length || 0})</Text>
                        {relatedData.consultations?.length > 0 ? (
                            relatedData.consultations.map((con, index) => (
                                <View key={con._id || index} style={styles.itemCard}>
                                    <View style={styles.row}>
                                        <Text style={styles.itemName}>{con.patientName}</Text>
                                        <Text style={[styles.status, { color: con.status === 'completed' ? 'green' : 'orange' }]}>
                                            {con.status}
                                        </Text>
                                    </View>
                                    <Text style={styles.itemDetail}>Date: {new Date(con.consultationDate).toLocaleDateString()} | Slot: {con.timeSlot}</Text>
                                    <Text style={styles.itemDetail}>Earnings: {formatCurrency(con.doctorShare)}</Text>
                                    <Text style={styles.itemDate}>{formatDate(con.createdAt)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No consultations yet</Text>
                        )}
                    </View>
                </>
            )}

            {/* Patient-specific data */}
            {isPatient && relatedData && (
                <>
                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{relatedData.totalBookings || 0}</Text>
                            <Text style={styles.statLabel}>Bookings</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{formatCurrency(relatedData.totalSpent)}</Text>
                            <Text style={styles.statLabel}>Total Spent</Text>
                        </View>
                    </View>

                    {/* Purchase History */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Purchase History ({relatedData.bookings?.length || 0})</Text>
                        {relatedData.bookings?.length > 0 ? (
                            relatedData.bookings.map((booking, index) => (
                                <TouchableOpacity
                                    key={booking._id || index}
                                    style={styles.clickableItemCard}
                                    onPress={() => openSaleDetail(booking)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.itemContent}>
                                        <Text style={styles.itemName}>{booking.equipmentName}</Text>
                                        <Text style={styles.itemDetail}>Provider: {booking.providerName}</Text>
                                        <Text style={styles.itemDetail}>Amount: {formatCurrency(booking.totalAmount)}</Text>
                                        <Text style={styles.itemDetail}>Days: {booking.totalDays} | Status: {booking.status}</Text>
                                        {booking.hasReview && booking.review ? (
                                            <Text style={{ fontSize: 12, color: "#FFC107", fontWeight: "600", marginTop: 2 }}>
                                                {"★".repeat(booking.review.rating || 0)}{"☆".repeat(5 - (booking.review.rating || 0))} — Reviewed
                                            </Text>
                                        ) : null}
                                        <Text style={styles.itemDate}>{formatDate(booking.createdAt)}</Text>
                                    </View>
                                    <View style={styles.chevronContainer}>
                                        <Text style={styles.chevronText}>›</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No purchases yet</Text>
                        )}
                    </View>
                </>
            )}

            <View style={{ height: 40 }} />

            {/* Sale Detail Modal */}
            {renderSaleDetailModal()}

            {/* Equipment Detail Modal */}
            {renderEquipmentDetailModal()}
        </ScrollView>
    );
}

// Helper component
const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, gap: 12 },
    loadingText: { marginTop: 10, color: C.textLight, fontWeight: "600" },
    errorText: { color: C.danger, marginBottom: 4, fontSize: 15, fontWeight: "600" },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    },
    retryText: { color: "white", fontWeight: "700" },

    // Profile Hero
    profileHero: {
        alignItems: "center", paddingBottom: 28,
        paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight || 24) + 16,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    },
    backBtn: {
        position: "absolute", top: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight || 24) + 12,
        left: 18, width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center", alignItems: "center",
    },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center", alignItems: "center", marginBottom: 14,
        borderWidth: 3, borderColor: "rgba(255,255,255,0.3)",
    },
    avatarText: { color: "white", fontSize: 32, fontWeight: "800" },
    userName: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 4, letterSpacing: -0.3 },
    userEmail: { fontSize: 14, color: "rgba(255,255,255,0.75)", marginBottom: 12 },
    typeBadge: {
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    },
    typeText: { color: "#fff", fontWeight: "700", textTransform: "capitalize" },

    section: { padding: 16 },
    sectionTitle: { fontSize: 17, fontWeight: "800", color: C.textDark, marginBottom: 12, letterSpacing: 0.1 },
    infoCard: {
        backgroundColor: C.surface, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, shadowColor: C.textDark,
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8,
    },
    infoRow: {
        flexDirection: "row", justifyContent: "space-between",
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    infoLabel: { color: C.textLight, fontSize: 14, fontWeight: "600" },
    infoValue: { color: C.textDark, fontSize: 14, fontWeight: "500", textAlign: "right", flex: 1, marginLeft: 10 },

    statsRow: {
        flexDirection: "row", justifyContent: "space-around", padding: 16,
        backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 10,
        borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, shadowColor: C.textDark,
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8,
    },
    statBox: { alignItems: "center", flex: 1 },
    statNumber: { fontSize: 22, fontWeight: "800", color: C.primary },
    statLabel: { fontSize: 12, color: C.textLight, fontWeight: "600", marginTop: 4 },

    itemCard: {
        backgroundColor: C.surface, borderRadius: 14, padding: 15, marginBottom: 10,
        borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, shadowColor: C.textDark,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
    },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    itemName: { fontSize: 15, fontWeight: "700", color: C.textDark, marginBottom: 6 },
    itemDetail: { fontSize: 13, color: C.textMid, marginBottom: 3 },
    itemDate: { fontSize: 11, color: C.textLight, marginTop: 6 },
    status: { fontWeight: "600" },
    emptyText: { color: C.textLight, fontStyle: "italic", textAlign: "center", padding: 20 },

    clickableItemCard: {
        backgroundColor: C.surface, borderRadius: 14, padding: 15, marginBottom: 10,
        borderWidth: 1, borderColor: C.cardBorder, flexDirection: "row", alignItems: "center",
        borderLeftWidth: 3, borderLeftColor: C.primary,
        elevation: 2, shadowColor: C.textDark,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
    },
    itemContent: { flex: 1 },
    chevronContainer: { paddingLeft: 10 },
    chevronText: { fontSize: 24, color: C.primary, fontWeight: "bold" },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, maxHeight: "85%",
    },
    modalHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    modalTitle: { fontSize: 20, fontWeight: "800", color: C.textDark },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg,
        justifyContent: "center", alignItems: "center",
    },
    closeBtnText: { fontSize: 18, color: C.textMid },
    modalSection: { marginBottom: 15 },
    modalSectionTitle: { fontSize: 14, fontWeight: "700", color: C.secondary, marginBottom: 8 },
    modalCard: {
        backgroundColor: C.bg, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    modalItemName: { fontSize: 18, fontWeight: "700", color: C.textDark, marginBottom: 10 },
    addressText: { fontSize: 14, color: C.textDark, lineHeight: 20 },
    cancelCard: { backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: "#FECACA" },
    bookingIdContainer: {
        marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: C.cardBorder,
        alignItems: "center",
    },
    bookingIdLabel: { fontSize: 12, color: C.textLight, marginBottom: 4 },
    bookingIdText: { fontSize: 11, color: C.textMid, fontFamily: "monospace" },

    // Verification Styles
    documentPreviewContainer: { marginTop: 5 },
    documentImage: { width: "100%", height: 200, borderRadius: 14, backgroundColor: C.bg },
    zoomOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, height: 200,
        backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 14,
        justifyContent: "center", alignItems: "center",
    },
    zoomText: { color: "white", fontSize: 14, fontWeight: "600", marginTop: 5 },
    documentFilePreview: {
        alignItems: "center", justifyContent: "center", padding: 20,
        backgroundColor: C.bg, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder,
        marginBottom: 15,
    },
    viewDocBtn: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: C.danger, paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 12, marginTop: 15, gap: 6,
    },
    viewDocBtnText: { color: "white", fontWeight: "700" },
    verificationActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, gap: 12 },
    verifyBtn: {
        flex: 0.48, flexDirection: "row", alignItems: "center", justifyContent: "center",
        paddingVertical: 12, borderRadius: 14, elevation: 2,
    },
    approveBtn: { backgroundColor: C.success },
    rejectBtn: { backgroundColor: C.danger },
    verifyBtnText: { color: "white", fontWeight: "700", fontSize: 15, marginLeft: 8 },
    disabledBtn: { opacity: 0.6 },
    noDocumentContainer: { alignItems: "center", padding: 30 },
    noDocumentText: { color: C.textLight, marginTop: 10, fontSize: 14, textAlign: "center" },
    fullImageOverlay: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" },
    fullImage: { width: "100%", height: "100%" },
    closeFullImage: { position: "absolute", top: 40, right: 20, zIndex: 10, padding: 10 },
});
