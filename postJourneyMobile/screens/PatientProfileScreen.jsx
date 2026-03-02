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
    Switch,
    ImageBackground,
    StatusBar,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

const BASE_URL = "http://172.16.230.150:5000";

export default function PatientProfileScreen({ route, navigation }) {
    const { userId, userEmail } = route.params || {};

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [profile, setProfile] = useState({
        name: "",
        email: "",
        age: "",
        gender: "",
        phoneNumber: "",
        city: "",
        primaryCondition: "",
        height: "",
        weight: "",
        bloodGroup: "",
        medicalHistory: "",
        emergencyContact: "",
        activityLevel: "",
        primaryGoal: "",
        surgeryHistory: "",
        currentMedications: "",
        smokingHabit: false,
        alcoholConsumption: "",
        sleepHours: "",
    });

    const [editedProfile, setEditedProfile] = useState({ ...profile });

    const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    const activityLevels = [
        { label: "Sedentary", value: "sedentary" },
        { label: "Lightly Active", value: "lightly_active" },
        { label: "Moderately Active", value: "moderately_active" },
        { label: "Very Active", value: "very_active" },
    ];
    const primaryGoals = [
        { label: "Pain Relief", value: "pain_relief" },
        { label: "Improve Mobility", value: "mobility" },
        { label: "Increase Strength", value: "strength" },
        { label: "Post-Surgical Recovery", value: "recovery" },
        { label: "General Wellness", value: "wellness" },
    ];
    const alcoholOptions = [
        { label: "Never", value: "never" },
        { label: "Occasional", value: "occasional" },
        { label: "Regular", value: "regular" },
    ];

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${BASE_URL}/api/patient/profile/${userId}`
            );

            if (response.data.success) {
                const p = response.data.profile;
                setProfile(p);
                setEditedProfile(p);
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
        if (!editedProfile.name || !editedProfile.phoneNumber) {
            Alert.alert("Error", "Name and Phone Number are required");
            return;
        }

        try {
            setSaving(true);
            const response = await axios.put(
                `${BASE_URL}/api/patient/update-profile`,
                {
                    userId,
                    fullName: editedProfile.name,
                    age: editedProfile.age,
                    gender: editedProfile.gender,
                    phoneNumber: editedProfile.phoneNumber,
                    city: editedProfile.city,
                    primaryCondition: editedProfile.primaryCondition,
                    height: editedProfile.height,
                    weight: editedProfile.weight,
                    bloodGroup: editedProfile.bloodGroup,
                    medicalHistory: editedProfile.medicalHistory,
                    emergencyContact: editedProfile.emergencyContact,
                    activityLevel: editedProfile.activityLevel,
                    primaryGoal: editedProfile.primaryGoal,
                    surgeryHistory: editedProfile.surgeryHistory,
                    currentMedications: editedProfile.currentMedications,
                    smokingHabit: editedProfile.smokingHabit,
                    alcoholConsumption: editedProfile.alcoholConsumption,
                    sleepHours: editedProfile.sleepHours,
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

    const getLabelForValue = (options, value) => {
        const found = options.find(o => o.value === value);
        return found ? found.label : value || "Not set";
    };

    const renderTextField = (label, key, icon, options = {}) => {
        const { keyboardType, multiline } = options;
        const value = isEditing ? editedProfile[key] : profile[key];

        return (
            <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                    <Ionicons name={icon} size={16} color="#5C768D" />
                    <Text style={styles.fieldLabel}>{label}</Text>
                </View>
                {isEditing ? (
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
                ) : (
                    <Text style={styles.fieldValue}>
                        {key === "age" && value ? `${value} years` :
                            key === "height" && value ? `${value} cm` :
                                key === "weight" && value ? `${value} kg` :
                                    key === "sleepHours" && value ? `${value} hours` :
                                        value || "Not set"}
                    </Text>
                )}
            </View>
        );
    };

    const renderPickerField = (label, key, icon, options) => {
        const value = isEditing ? editedProfile[key] : profile[key];

        return (
            <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                    <Ionicons name={icon} size={16} color="#5C768D" />
                    <Text style={styles.fieldLabel}>{label}</Text>
                </View>
                {isEditing ? (
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={editedProfile[key]}
                            onValueChange={(val) =>
                                setEditedProfile({ ...editedProfile, [key]: val })
                            }
                            style={styles.picker}
                            dropdownIconColor="#0A3D52"
                        >
                            <Picker.Item label="Select..." value="" color="#fff" />
                            {options.map((opt) => (
                                <Picker.Item
                                    key={opt.value || opt}
                                    label={opt.label || opt}
                                    value={opt.value || opt}
                                    color="#fff"
                                />
                            ))}
                        </Picker>
                    </View>
                ) : (
                    <Text style={styles.fieldValue}>
                        {Array.isArray(options) && options[0]?.label
                            ? getLabelForValue(options, value)
                            : value || "Not set"}
                    </Text>
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
                                    {profile.name ? profile.name.charAt(0).toUpperCase() : "P"}
                                </Text>
                            </View>
                            <Text style={styles.profileName}>{profile.name || "Patient"}</Text>
                            <Text style={styles.profileEmail}>{profile.email}</Text>
                        </View>

                        {/* Section 1: Basic Information */}
                        <View style={styles.sectionHeader}>
                            <Ionicons name="person-outline" size={18} color="#0A3D52" />
                            <Text style={styles.sectionTitle}>Basic Information</Text>
                        </View>

                        {renderTextField("Full Name", "name", "person-circle-outline")}

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                {renderTextField("Age", "age", "calendar-outline", { keyboardType: "numeric" })}
                            </View>
                            <View style={{ flex: 1 }}>
                                {renderPickerField("Gender", "gender", "male-female-outline", [
                                    { label: "Male", value: "male" },
                                    { label: "Female", value: "female" },
                                    { label: "Other", value: "other" },
                                ])}
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                {renderTextField("Height (cm)", "height", "resize-outline", { keyboardType: "numeric" })}
                            </View>
                            <View style={{ flex: 1 }}>
                                {renderTextField("Weight (kg)", "weight", "barbell-outline", { keyboardType: "numeric" })}
                            </View>
                        </View>

                        {renderTextField("Phone Number", "phoneNumber", "call-outline", { keyboardType: "phone-pad" })}
                        {renderTextField("City", "city", "location-outline")}

                        {/* Section 2: Medical Background */}
                        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                            <Ionicons name="medkit-outline" size={18} color="#0A3D52" />
                            <Text style={styles.sectionTitle}>Medical Background</Text>
                        </View>

                        {renderPickerField("Blood Group", "bloodGroup", "water-outline",
                            bloodGroups.map(g => ({ label: g, value: g }))
                        )}
                        {renderTextField("Primary Condition", "primaryCondition", "heart-outline")}
                        {renderTextField("Past Surgeries", "surgeryHistory", "bandage-outline", { multiline: true })}
                        {renderTextField("Current Medications", "currentMedications", "medical-outline", { multiline: true })}
                        {renderTextField("Medical History", "medicalHistory", "document-text-outline", { multiline: true })}
                        {renderTextField("Emergency Contact", "emergencyContact", "alert-circle-outline", { keyboardType: "phone-pad" })}

                        {/* Section 3: Lifestyle & Goals */}
                        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                            <Ionicons name="leaf-outline" size={18} color="#0A3D52" />
                            <Text style={styles.sectionTitle}>Lifestyle & Goals</Text>
                        </View>

                        {renderPickerField("Activity Level", "activityLevel", "walk-outline", activityLevels)}
                        {renderPickerField("Primary Goal", "primaryGoal", "trophy-outline", primaryGoals)}

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                {renderTextField("Sleep (Hours)", "sleepHours", "moon-outline", { keyboardType: "numeric" })}
                            </View>
                            <View style={{ flex: 1 }}>
                                {renderPickerField("Alcohol Use", "alcoholConsumption", "wine-outline", alcoholOptions)}
                            </View>
                        </View>

                        {/* Smoking Toggle */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.switchRow}>
                                <View style={styles.fieldLabelRow}>
                                    <Ionicons name="flame-outline" size={16} color="#5C768D" />
                                    <Text style={styles.fieldLabel}>Smoking Habit</Text>
                                </View>
                                {isEditing ? (
                                    <Switch
                                        value={editedProfile.smokingHabit}
                                        onValueChange={(val) =>
                                            setEditedProfile({ ...editedProfile, smokingHabit: val })
                                        }
                                        trackColor={{ false: "#D7E5ED", true: "#1D8FAB" }}
                                        thumbColor={editedProfile.smokingHabit ? "#ffffff" : "#f1f5f9"}
                                    />
                                ) : (
                                    <Text style={[styles.fieldValue, { flex: 0, paddingHorizontal: 16 }]}>
                                        {profile.smokingHabit ? "Yes" : "No"}
                                    </Text>
                                )}
                            </View>
                        </View>

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
                                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
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
    profileName: { fontSize: 22, fontWeight: "700", color: "#0A3D52", marginBottom: 4 },
    profileEmail: { fontSize: 14, color: "#5C768D" },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        gap: 8,
    },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: "#2C3E50" },

    row: { flexDirection: "row" },

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
        marginBottom: 8,
    },
    picker: {
        height: 50,
        color: "#0A3D52",
    },

    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
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
