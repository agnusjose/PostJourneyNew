import React, { useState, useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
    ScrollView, Alert, ActivityIndicator,
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

export default function CaregiverEditProfile({ route, navigation }) {
    const { userId, email } = route.params;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        agencyName: "",
        phoneNumber: "",
        city: "",
        caregivingServices: "",
        patientTypes: "",
        serviceLocations: "",
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/admin/users/${userId}/details`);
            if (res.data.success) {
                const u = res.data.user;
                const pp = u.providerProfile || {};
                setFormData({
                    agencyName: pp.agencyName || u.agencyName || "",
                    phoneNumber: u.phoneNumber || "",
                    city: u.city || "",
                    caregivingServices: pp.caregivingServices || "",
                    patientTypes: pp.patientTypes || "",
                    serviceLocations: pp.serviceLocations || "",
                });
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.agencyName || !formData.phoneNumber || !formData.city) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }
        if (formData.phoneNumber.length !== 10) {
            Alert.alert("Error", "Please enter a valid 10-digit phone number");
            return;
        }

        setSaving(true);
        try {
            const res = await axios.post(
                `${BASE_URL}/api/service-provider/complete-profile`,
                {
                    email,
                    agencyName: formData.agencyName,
                    serviceType: "caregiver",
                    phoneNumber: formData.phoneNumber,
                    city: formData.city,
                    caregivingServices: formData.caregivingServices,
                    patientTypes: formData.patientTypes,
                    serviceLocations: formData.serviceLocations,
                }
            );
            if (res.data.success) {
                Alert.alert("Success", "Profile updated successfully", [
                    { text: "OK", onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert("Error", res.data.message || "Failed to update profile");
            }
        } catch (err) {
            console.error("Error saving profile:", err);
            Alert.alert("Error", "Failed to update profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.root, styles.centered]}>
                <ActivityIndicator size="large" color={C.secondary} />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hdrG}>
                <View style={styles.hdr}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <Text style={styles.headerSubtitle}>Update your caregiver details</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Form */}
                <View style={styles.formCard}>
                    <Text style={styles.label}>Agency / Company Name</Text>
                    <TextInput style={styles.input} placeholder="Enter your agency name"
                        placeholderTextColor={C.textMuted} value={formData.agencyName}
                        onChangeText={(text) => setFormData({ ...formData, agencyName: text })} />

                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput style={styles.input} placeholder="10-digit phone number"
                        placeholderTextColor={C.textMuted} keyboardType="phone-pad" maxLength={10}
                        value={formData.phoneNumber}
                        onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })} />

                    <Text style={styles.label}>City</Text>
                    <TextInput style={styles.input} placeholder="Your city"
                        placeholderTextColor={C.textMuted} value={formData.city}
                        onChangeText={(text) => setFormData({ ...formData, city: text })} />

                    <Text style={styles.label}>Caregiving Services Offered</Text>
                    <TextInput style={[styles.input, styles.textArea]}
                        placeholder="e.g. Elderly Care, Post-Surgery Care, Physiotherapy"
                        placeholderTextColor={C.textMuted} multiline value={formData.caregivingServices}
                        onChangeText={(text) => setFormData({ ...formData, caregivingServices: text })} />

                    <Text style={styles.label}>Types of Patients Considered</Text>
                    <TextInput style={[styles.input, styles.textArea]}
                        placeholder="e.g. Elderly, Post-surgical, Disabled, Bedridden"
                        placeholderTextColor={C.textMuted} multiline value={formData.patientTypes}
                        onChangeText={(text) => setFormData({ ...formData, patientTypes: text })} />

                    <Text style={styles.label}>Service Locations / Areas</Text>
                    <TextInput style={[styles.input, styles.textArea]}
                        placeholder="e.g. Mukkam, Kochi, Petta"
                        placeholderTextColor={C.textMuted} multiline value={formData.serviceLocations}
                        onChangeText={(text) => setFormData({ ...formData, serviceLocations: text })} />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave} disabled={saving}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Changes"}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    centered: { justifyContent: "center", alignItems: "center" },
    hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 22 },
    hdr: { flexDirection: "row", alignItems: "center" },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: "center", alignItems: "center", marginRight: 16 },
    headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 2 },

    content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 },

    formCard: {
        backgroundColor: C.card, borderRadius: 20, padding: 22, marginBottom: 20,
        elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder,
    },
    label: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 8, marginTop: 16 },
    input: {
        borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, padding: 14,
        fontSize: 15, color: C.text, backgroundColor: C.lightTeal,
    },
    textArea: { height: 72, textAlignVertical: "top" },

    saveButton: {
        flexDirection: "row", backgroundColor: C.primary, padding: 18, borderRadius: 16,
        alignItems: "center", justifyContent: "center",
        elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8,
    },
    saveButtonDisabled: { backgroundColor: C.textMuted },
    saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
