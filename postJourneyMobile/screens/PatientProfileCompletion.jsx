import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";

export default function PatientProfileCompletion({ route, navigation }) {
  const { email } = route.params;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "male",
    phoneNumber: "",
    city: "",
    primaryCondition: "",
    height: "",
    weight: "",
    bloodGroup: "O+",
    medicalHistory: "",
    emergencyContact: "",
    activityLevel: "lightly_active",
    primaryGoal: "recovery",
    surgeryHistory: "",
    currentMedications: "",
    smokingHabit: false,
    alcoholConsumption: "never",
    sleepHours: "7",
  });

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const activityLevels = [
    { label: "Sedentary (Little to no exercise)", value: "sedentary" },
    { label: "Lightly Active (1-2 days/week)", value: "lightly_active" },
    { label: "Moderately Active (3-5 days/week)", value: "moderately_active" },
    { label: "Very Active (6-7 days/week)", value: "very_active" },
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

  const handleSubmit = async () => {
    const { fullName, age, phoneNumber, city, primaryCondition } = formData;

    if (!fullName || !age || !phoneNumber || !city || !primaryCondition) {
      Alert.alert("Required Fields", "Please fill in all mandatory fields (*)");
      return;
    }

    // Name Validation (Only letters and spaces)
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(fullName)) {
      Alert.alert("Invalid Name", "Name should only contain letters and spaces.");
      return;
    }

    // Indian Phone Validation (10 digits, starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert("Invalid Phone Number", "Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.");
      return;
    }

    // Age Validation (1-120)
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      Alert.alert("Invalid Age", "Please enter a valid age between 1 and 120.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://172.16.230.150:5000/api/patient/complete-profile",
        {
          email,
          ...formData
        }
      );

      if (response.data.success) {
        Alert.alert(
          "Profile Completed!",
          "Welcome to PostJourney. Your personalized health path is ready.",
          [{ text: "Start Journey", onPress: () => navigation.replace("LoginScreen") }]
        );
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (error) {
      console.error("Submit error:", error);
      Alert.alert("Error", "Failed to save profile. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, value, key, icon, placeholder, keyboardType = "default", multiline = false, required = false) => (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label} {required && "*"}</Text>
      <View style={[styles.inputContainer, multiline && styles.textAreaContainer]}>
        <MaterialCommunityIcons name={icon} size={20} color="#1D8FAB" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, multiline && styles.textArea]}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={(text) => setFormData({ ...formData, [key]: text })}
          keyboardType={keyboardType}
          multiline={multiline}
        />
      </View>
    </View>
  );

  const renderSectionHeader = (title, icon) => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={22} color="#1e293b" style={styles.sectionIcon} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Personalize Your Journey</Text>
            <Text style={styles.subtitle}>Tell us more about your health to provide the most precise care possible.</Text>
          </View>

          {/* Section 1: Basic Stats */}
          <View style={styles.card}>
            {renderSectionHeader("Basic Information", "account-details")}

            {renderInput("Full Name", formData.fullName, "fullName", "account", "Your Name", "default", false, true)}

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                {renderInput("Age", formData.age, "age", "calendar-range", "Age", "numeric", false, true)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Gender *</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.gender}
                    onValueChange={(val) => setFormData({ ...formData, gender: val })}
                    style={styles.picker}
                    dropdownIconColor="#0A3D52"
                  >
                    <Picker.Item label="Male" value="male" color="#fff" />
                    <Picker.Item label="Female" value="female" color="#fff" />
                    <Picker.Item label="Other" value="other" color="#fff" />
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                {renderInput("Height (cm)", formData.height, "height", "human-male-height", "cm", "numeric")}
              </View>
              <View style={{ flex: 1 }}>
                {renderInput("Weight (kg)", formData.weight, "weight", "weight-kilogram", "kg", "numeric")}
              </View>
            </View>

            {renderInput("Phone Number", formData.phoneNumber, "phoneNumber", "phone", "10-digit", "phone-pad", false, true)}
            {renderInput("City", formData.city, "city", "map-marker", "City", "default", false, true)}
          </View>

          {/* Section 2: Health Details */}
          <View style={styles.card}>
            {renderSectionHeader("Medical Background", "hospital-building")}

            <Text style={styles.inputLabel}>Blood Group</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.bloodGroup}
                onValueChange={(val) => setFormData({ ...formData, bloodGroup: val })}
                style={styles.picker}
                dropdownIconColor="#0A3D52"
              >
                {bloodGroups.map((group) => (
                  <Picker.Item key={group} label={group} value={group} color="#fff" />
                ))}
              </Picker>
            </View>

            {renderInput("Primary Health Condition", formData.primaryCondition, "primaryCondition", "heart-pulse", "e.g. Back Pain", "default", false, true)}
            {renderInput("Past Surgeries (if any)", formData.surgeryHistory, "surgeryHistory", "doctor", "Describe past surgeries...", "default", true)}
            {renderInput("Current Medications", formData.currentMedications, "currentMedications", "pill", "List current medications...", "default", true)}
            {renderInput("Medical History", formData.medicalHistory, "medicalHistory", "clipboard-text", "Allergies or chronic issues...", "default", true)}
            {renderInput("Emergency Contact", formData.emergencyContact, "emergencyContact", "phone-alert", "Family member's phone", "phone-pad")}
          </View>

          {/* Section 3: Lifestyle & Goals */}
          <View style={styles.card}>
            {renderSectionHeader("Lifestyle & Goals", "leaf")}

            <Text style={styles.inputLabel}>Activity Level</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.activityLevel}
                onValueChange={(val) => setFormData({ ...formData, activityLevel: val })}
                style={styles.picker}
                dropdownIconColor="#0A3D52"
              >
                {activityLevels.map((opt) => (
                  <Picker.Item key={opt.value} label={opt.label} value={opt.value} color="#fff" />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Primary Recovery Goal</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.primaryGoal}
                onValueChange={(val) => setFormData({ ...formData, primaryGoal: val })}
                style={styles.picker}
                dropdownIconColor="#0A3D52"
              >
                {primaryGoals.map((opt) => (
                  <Picker.Item key={opt.value} label={opt.label} value={opt.value} color="#fff" />
                ))}
              </Picker>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                {renderInput("Sleep (Hrs)", formData.sleepHours, "sleepHours", "sleep", "Avg hours", "numeric")}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Alcohol Use</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.alcoholConsumption}
                    onValueChange={(val) => setFormData({ ...formData, alcoholConsumption: val })}
                    style={styles.picker}
                    dropdownIconColor="#0A3D52"
                  >
                    {alcoholOptions.map((opt) => (
                      <Picker.Item key={opt.value} label={opt.label} value={opt.value} color="#fff" />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <MaterialCommunityIcons name="smoking" size={24} color="#64748b" />
                <Text style={styles.switchLabel}>Smoking Habit</Text>
              </View>
              <Switch
                value={formData.smokingHabit}
                onValueChange={(val) => setFormData({ ...formData, smokingHabit: val })}
                trackColor={{ false: "#D7E5ED", true: "#1D8FAB" }}
                thumbColor={formData.smokingHabit ? "#ffffff" : "#f1f5f9"}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>FINALIZE PROFILE</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0A3D52",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#4A7A8C",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0A5F7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#D7E5ED",
    paddingBottom: 10,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0A3D52",
  },
  inputWrapper: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0A3D52",
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#D7E5ED",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0A3D52",
  },
  textAreaContainer: {
    alignItems: "flex-start",
    paddingTop: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pickerWrapper: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#D7E5ED",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: "#0A3D52",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0A3D52",
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: "#0A5F7A",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    elevation: 3,
    marginBottom: 40,
  },
  disabledButton: {
    backgroundColor: "#8AACB8",
  },
  submitButtonText: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
