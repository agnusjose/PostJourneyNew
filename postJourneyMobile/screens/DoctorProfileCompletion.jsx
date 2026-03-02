import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import axios from "axios";

export default function DoctorProfileCompletion({ route, navigation }) {
    const { email, isEditing } = route.params || {};
    const [name, setName] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [experience, setExperience] = useState("");
    const [qualification, setQualification] = useState("");
    const [languages, setLanguages] = useState("");
    const [about, setAbout] = useState("");
    const [image, setImage] = useState(null);
    const [existingImageUrl, setExistingImageUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (isEditing) {
            fetchProfile();
        }
    }, [isEditing]);

    const fetchProfile = async () => {
        setFetching(true);
        try {
            const response = await axios.get(`http://192.168.172.72:5000/api/doctor/profile?email=${email}`);
            if (response.data.success) {
                const p = response.data.profile;
                setName(p.name || "");
                setSpecialization(p.specialization);
                setExperience(p.experience);
                setQualification(p.qualification);
                setLanguages(p.languages);
                setAbout(p.about);
                if (p.doctorImage) {
                    setExistingImageUrl(`http://192.168.172.72:5000${p.doctorImage}`);
                }
            }
        } catch (error) {
            console.error("Fetch profile error:", error);
        } finally {
            setFetching(false);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setExistingImageUrl(null);
        }
    };

    const handleSubmit = async () => {
        if (!name || !specialization || !experience || !qualification || (!image && !existingImageUrl)) {
            Alert.alert("Error", "Please fill in all required fields and upload a photo.");
            return;
        }

        const formData = new FormData();
        formData.append("email", email);
        formData.append("name", name);
        formData.append("specialization", specialization);
        formData.append("experience", experience);
        formData.append("qualification", qualification);
        formData.append("languages", languages);
        formData.append("about", about);

        if (image) {
            const filename = image.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image`;
            formData.append("doctorImage", { uri: image, name: filename, type });
        }

        setLoading(true);
        try {
            const response = await axios.post("http://192.168.172.72:5000/api/doctor/complete-profile", formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                Alert.alert("Success", isEditing ? "Profile updated successfully!" : "Profile completed successfully!");
                navigation.replace("DoctorDashboard", {
                    userName: response.data.name,
                    userId: response.data.userId,
                    userEmail: email,
                });
            } else {
                Alert.alert("Error", response.data.message);
            }
        } catch (error) {
            console.error("Profile update error:", error);
            Alert.alert("Error", "Failed to update profile. Try again.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#1D8FAB" />
                <Text style={{ marginTop: 10 }}>Loading profile...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>{isEditing ? "Edit Your Profile" : "Complete Your Doctor Profile"}</Text>

            <Text style={styles.caution}>⚠️ Please upload a profile photo in formal attire only.</Text>

            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {image || existingImageUrl ? (
                    <Image source={{ uri: image || existingImageUrl }} style={styles.profileImage} />
                ) : (
                    <Text style={styles.imagePlaceholder}>Upload Profile Photo *</Text>
                )}
            </TouchableOpacity>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
                style={styles.input}
                placeholder="Dr. John Doe"
                value={name}
                onChangeText={setName}
            />

            <Text style={styles.label}>Specialization *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. Cardiologist, Physiotherapist"
                value={specialization}
                onChangeText={setSpecialization}
            />

            <Text style={styles.label}>Qualification *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. MBBS, MD"
                value={qualification}
                onChangeText={setQualification}
            />

            <Text style={styles.label}>Experience (Years) *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={experience}
                onChangeText={setExperience}
            />

            <Text style={styles.label}>Languages Spoken</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. English, Hindi, Malayalam"
                value={languages}
                onChangeText={setLanguages}
            />

            <Text style={styles.label}>About You</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Briefly describe your expertise..."
                multiline
                numberOfLines={4}
                value={about}
                onChangeText={setAbout}
            />

            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isEditing ? "Update Profile" : "Submit Profile"}</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 25, backgroundColor: "#fff", flexGrow: 1 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 15, color: "#0A3D52", textAlign: "center" },
    caution: { fontSize: 14, color: "#dc2626", backgroundColor: "#fee2e2", padding: 10, borderRadius: 8, marginBottom: 20, textAlign: "center", fontWeight: "600" },
    imagePicker: { height: 150, width: 150, borderRadius: 75, backgroundColor: "#f1f5f9", alignSelf: "center", justifyContent: "center", alignItems: "center", marginBottom: 20, borderStyle: "dashed", borderWidth: 2, borderColor: "#cbd5e1", overflow: "hidden" },
    profileImage: { width: "100%", height: "100%" },
    imagePlaceholder: { color: "#4A7A8C", textAlign: "center", padding: 10 },
    label: { fontSize: 16, fontWeight: "600", marginBottom: 5, color: "#0A3D52" },
    input: { backgroundColor: "#E0F2F7", padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16, color: "#0A3D52" },
    textArea: { height: 100, textAlignVertical: "top" },
    button: { backgroundColor: "#0A5F7A", padding: 16, borderRadius: 8, alignItems: "center", marginTop: 10 },
    buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
