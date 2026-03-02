import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    ImageBackground,
    StatusBar,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

const BASE_URL = "http://172.16.230.150:5000";

export default function ServiceProviderProfileScreen({ route, navigation }) {
    const { userId, userEmail } = route.params || {};

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [profile, setProfile] = useState({
        name: "",
        email: "",
        agencyName: "",
        serviceType: "",
        phoneNumber: "",
        city: "",
        // Caregiver-specific
        caregivingServices: "",
        patientTypes: "",
        serviceLocations: "",
        // Common
        aboutUs: "",
        operatingHours: "",
        fullAddress: "",
        website: "",
        licenseNumber: "",
    });

    const [editedProfile, setEditedProfile] = useState({ ...profile });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${BASE_URL}/api/service-provider/profile/${userId}`
            );

            if (response.data.success) {
                const profileData = response.data.profile;
                setProfile(profileData);
                setEditedProfile(profileData);
            } else {
                Alert.alert("Error", response.data.message || "Failed to load profile");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            Alert.alert("Error", "Failed to load profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editedProfile.agencyName || !editedProfile.phoneNumber) {
            Alert.alert("Error", "Agency Name and Phone Number are required");
            return;
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(editedProfile.phoneNumber)) {
            Alert.alert("Invalid Phone", "Please enter a valid 10-digit phone number.");
            return;
        }

        try {
            setSaving(true);
            const response = await axios.put(
                `${BASE_URL}/api/service-provider/update-profile`,
                {
                    userId,
                    agencyName: editedProfile.agencyName,
                    serviceType: editedProfile.serviceType,
                    phoneNumber: editedProfile.phoneNumber,
                    city: editedProfile.city,
                    // Caregiver-specific
                    caregivingServices: editedProfile.caregivingServices,
                    patientTypes: editedProfile.patientTypes,
                    serviceLocations: editedProfile.serviceLocations,
                    // Common
                    aboutUs: editedProfile.aboutUs,
                    operatingHours: editedProfile.operatingHours,
                    fullAddress: editedProfile.fullAddress,
                    website: editedProfile.website,
                    licenseNumber: editedProfile.licenseNumber,
                }
            );

            if (response.data.success) {
                setProfile({ ...editedProfile, ...response.data.profile });
                setIsEditing(false);
                Alert.alert("Success", "Profile updated successfully!");
            } else {
                Alert.alert("Error", response.data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", "Failed to update profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedProfile({ ...profile });
        setIsEditing(false);
    };

    const serviceTypeLabels = {
        equipment: "Equipment Provider",
        caregiver: "Caregiver",
        physiotherapy: "Physiotherapy",
        nursing: "Nursing",
    };

    const renderField = (label, key, icon, options = {}) => {
        const { keyboardType, multiline, editable = true } = options;
        const value = isEditing ? editedProfile[key] : profile[key];
        const displayValue = key === "serviceType"
            ? serviceTypeLabels[value] || value || "Not set"
            : value || "Not set";

        return (
            <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                    <Ionicons name={icon} size={16} color="#5C768D" />
                    <Text style={styles.fieldLabel}>{label}</Text>
                </View>
                {isEditing && editable ? (
                    key === "serviceType" ? (
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={editedProfile.serviceType}
                                onValueChange={(val) =>
                                    setEditedProfile({ ...editedProfile, serviceType: val })
                                }
                                style={styles.picker}
                                dropdownIconColor="#0A3D52"
                            >
                                <Picker.Item label="Equipment Provider" value="equipment" color="#fff" />
                                <Picker.Item label="Caregiver" value="caregiver" color="#fff" />
                                <Picker.Item label="Physiotherapy" value="physiotherapy" color="#fff" />
                                <Picker.Item label="Nursing" value="nursing" color="#fff" />
                            </Picker>
                        </View>
                    ) : (
                        <TextInput
                            style={[styles.input, multiline && styles.multilineInput]}
                            value={String(value || "")}
                            onChangeText={(text) =>
                                setEditedProfile({ ...editedProfile, [key]: text })
                            }
                            keyboardType={keyboardType || "default"}
                            multiline={multiline}
                            placeholder={`Enter ${label.toLowerCase()}`}
                        />
                    )
                ) : (
                    <Text style={styles.fieldValue}>{displayValue}</Text>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <ImageBackground
                source={require("../assets/pjlogo_bg.png")}
                style={styles.bg}
                resizeMode="cover"
            >
                <View style={[styles.overlay, styles.centered]}>
                    <ActivityIndicator size="large" color="#1E88E5" />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground
            source={require("../assets/pjlogo_bg.png")}
            style={styles.bg}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <StatusBar barStyle="dark-content" />
                <ScrollView
                    contentContainerStyle={styles.container}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#0A3D52" />
                        </TouchableOpacity>
                        <Text style={styles.title}>My Profile</Text>
                        {!isEditing && (
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => setIsEditing(true)}
                            >
                                <Ionicons name="create-outline" size={18} color="#1E88E5" />
                                <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {(profile.agencyName || profile.name || "P").charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.profileName}>
                                {profile.agencyName || profile.name || "Provider"}
                            </Text>
                            <Text style={styles.profileEmail}>{profile.email}</Text>
                            <View style={styles.serviceTypeBadge}>
                                <Ionicons name="briefcase-outline" size={14} color="#1E88E5" />
                                <Text style={styles.serviceTypeText}>
                                    {serviceTypeLabels[profile.serviceType] || profile.serviceType || "Provider"}
                                </Text>
                            </View>
                        </View>

                        {/* Business Info */}
                        <View style={styles.sectionHeader}>
                            <Ionicons name="business-outline" size={18} color="#0A3D52" />
                            <Text style={styles.sectionTitle}>Business Information</Text>
                        </View>

                        {renderField("Agency / Company Name", "agencyName", "storefront-outline")}
                        {renderField("Service Type", "serviceType", "briefcase-outline")}
                        {renderField("Phone Number", "phoneNumber", "call-outline", { keyboardType: "phone-pad" })}
                        {renderField("City", "city", "location-outline")}
                        {renderField("Full Address", "fullAddress", "map-outline", { multiline: true })}

                        {/* Caregiver-specific OR Equipment details section */}
                        {profile.serviceType === "caregiver" ? (
                            <>
                                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                                    <Ionicons name="heart-outline" size={18} color="#8E24AA" />
                                    <Text style={styles.sectionTitle}>Caregiver Details</Text>
                                </View>
                                {renderField("Caregiving Services", "caregivingServices", "medkit-outline", { multiline: true })}
                                {renderField("Patient Types Considered", "patientTypes", "people-outline", { multiline: true })}
                                {renderField("Service Locations", "serviceLocations", "map-outline", { multiline: true })}
                                {renderField("Operating Hours", "operatingHours", "alarm-outline")}
                                {renderField("About Us", "aboutUs", "information-circle-outline", { multiline: true })}
                            </>
                        ) : (
                            <>
                                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                                    <Ionicons name="ribbon-outline" size={18} color="#0A3D52" />
                                    <Text style={styles.sectionTitle}>Business Details</Text>
                                </View>
                                {renderField("Operating Hours", "operatingHours", "alarm-outline")}
                                {renderField("About Us", "aboutUs", "information-circle-outline", { multiline: true })}
                            </>
                        )}

                        {/* License & Web */}
                        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                            <Ionicons name="document-text-outline" size={18} color="#0A3D52" />
                            <Text style={styles.sectionTitle}>License & Website</Text>
                        </View>

                        {renderField("License Number", "licenseNumber", "shield-checkmark-outline")}
                        {renderField("Website", "website", "globe-outline")}

                        {/* Action Buttons */}
                        {isEditing && (
                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleCancel}
                                    disabled={saving}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    <Ionicons
                                        name="checkmark-circle-outline"
                                        size={20}
                                        color="#fff"
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={styles.saveButtonText}>
                                        {saving ? "Saving..." : "Save Changes"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    overlay: { flex: 1, backgroundColor: "rgba(245, 250, 255, 0.85)" },
    centered: { justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 12, color: "#4A7A8C", fontSize: 16 },

    container: { paddingHorizontal: 22, paddingTop: 50, paddingBottom: 40 },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        elevation: 2,
        shadowColor: "#2C3E50",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    title: { fontSize: 22, fontWeight: "700", color: "#2C3E50" },
    editButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E0F2F7",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 5,
    },
    editButtonText: { color: "#0A5F7A", fontWeight: "700", fontSize: 14 },

    profileCard: {
        backgroundColor: "#fff",
        borderRadius: 22,
        padding: 24,
        shadowColor: "#2C3E50",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: "#D7E5ED",
    },

    avatarContainer: {
        alignItems: "center",
        marginBottom: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#0A5F7A",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
    profileName: {
        fontSize: 22,
        fontWeight: "700",
        color: "#0A3D52",
        marginBottom: 4,
        textAlign: "center",
    },
    profileEmail: { fontSize: 14, color: "#4A7A8C", marginBottom: 8 },
    serviceTypeBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E0F2F7",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 5,
    },
    serviceTypeText: { color: "#0A5F7A", fontWeight: "600", fontSize: 12 },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0A3D52",
    },

    fieldGroup: { marginBottom: 16 },
    fieldLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#4A7A8C",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    fieldValue: {
        fontSize: 16,
        color: "#0A3D52",
        fontWeight: "500",
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
    },

    input: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        backgroundColor: "#fff",
        color: "#0A3D52",
    },
    multilineInput: { height: 80, textAlignVertical: "top" },

    pickerContainer: {
        borderWidth: 1.5,
        borderColor: "#D7E5ED",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#fff",
    },
    picker: {
        height: 50,
        color: "#0A3D52",
    },

    buttonRow: {
        flexDirection: "row",
        marginTop: 20,
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: "#F1F5F9",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    cancelButtonText: { color: "#64748B", fontWeight: "700", fontSize: 16 },
    saveButton: {
        flex: 2,
        flexDirection: "row",
        backgroundColor: "#0A5F7A",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonDisabled: { backgroundColor: "#94A3B8" },
    saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
