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
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";

export default function ServiceProviderProfileCompletion({ route, navigation }) {
  const { email } = route.params;
  const [loading, setLoading] = useState(false);
  const [licenseFile, setLicenseFile] = useState(null);

  const [formData, setFormData] = useState({
    agencyName: "",
    serviceType: "equipment",
    phoneNumber: "",
    city: "",
    caregivingServices: "",
    patientTypes: "",
    serviceLocations: "",
    aboutUs: "",
    operatingHours: "",
    fullAddress: "",
    website: "",
    licenseNumber: "",
  });

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setLicenseFile(result.assets[0]);
      }
    } catch (err) {
      console.error("Document picking error:", err);
      Alert.alert("Error", "Could not pick document. Please try again.");
    }
  };

  const handleSubmit = async () => {
    const { agencyName, phoneNumber, city, serviceType, website, fullAddress, aboutUs, caregivingServices, patientTypes, serviceLocations } = formData;

    // Required for ALL providers
    if (!agencyName || !phoneNumber || !city || !serviceType) {
      Alert.alert("Required Fields", "Please fill in all mandatory fields (*)");
      return;
    }

    if (!fullAddress || !fullAddress.trim()) {
      Alert.alert("Required Fields", "Full Address is required.");
      return;
    }

    if (!aboutUs || !aboutUs.trim()) {
      Alert.alert("Required Fields", "About Business is required.");
      return;
    }

    // Required ONLY for caregiver providers
    if (serviceType === "caregiver") {
      if (!caregivingServices || !caregivingServices.trim()) {
        Alert.alert("Required Fields", "Please describe the Caregiving Services you offer.");
        return;
      }
      if (!patientTypes || !patientTypes.trim()) {
        Alert.alert("Required Fields", "Please describe the Types of Patients you consider.");
        return;
      }
      if (!serviceLocations || !serviceLocations.trim()) {
        Alert.alert("Required Fields", "Please specify the Service Locations / Areas you cover.");
        return;
      }
    }

    // Agency Name Validation (Letters, numbers, and spaces)
    const agencyRegex = /^[a-zA-Z0-9\s]+$/;
    if (!agencyRegex.test(agencyName)) {
      Alert.alert("Invalid Name", "Agency name should only contain letters, numbers, and spaces.");
      return;
    }

    // Indian Phone Validation (10 digits, starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert("Invalid Phone Number", "Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.");
      return;
    }

    // Website URL Validation (if provided)
    if (website && website.trim() !== "") {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
      if (!urlRegex.test(website)) {
        Alert.alert("Invalid Website", "Please enter a valid website URL.");
        return;
      }
    }

    if (!licenseFile) {
      Alert.alert("Verification Required", "Please upload your license document (Image, PDF, or Word).");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("email", email);

      // Append all fields
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });

      // Append file
      const filename = licenseFile.name || licenseFile.uri.split("/").pop();
      const type = licenseFile.mimeType || "application/octet-stream";

      data.append("licenseImage", {
        uri: Platform.OS === "android" ? licenseFile.uri : licenseFile.uri.replace("file://", ""),
        name: filename,
        type: type,
      });

      const response = await axios.post(
        "http://192.168.172.72:5000/api/service-provider/complete-profile",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        Alert.alert(
          "Profile Submitted!",
          "Your profile has been submitted for admin approval. Please login after admin verifies your account.",
          [{ text: "Go to Login", onPress: () => navigation.replace("LoginScreen") }]
        );
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (error) {
      console.error("Submit error:", error);
      Alert.alert("Upload Failed", "Could not submit profile. Please check your network and try again.");
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
            <Text style={styles.title}>Provider Profile</Text>
            <Text style={styles.subtitle}>Complete your business profile to start providing services on PostJourney.</Text>
          </View>

          {/* Section 1: Business Details */}
          <View style={styles.card}>
            {renderSectionHeader("Agency Information", "office-building")}

            {renderInput("Agency / Company Name", formData.agencyName, "agencyName", "domain", "TrustCare Meds", "default", false, true)}

            <Text style={styles.inputLabel}>Service Type *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.serviceType}
                onValueChange={(val) => setFormData({ ...formData, serviceType: val })}
                style={styles.picker}
                dropdownIconColor="#0A3D52"
              >
                <Picker.Item label="Medical Equipment Provider" value="equipment" color="#fff" />
                <Picker.Item label="Caregiver Service Provider" value="caregiver" color="#fff" />
              </Picker>
            </View>

            {renderInput("Phone Number", formData.phoneNumber, "phoneNumber", "phone", "10-digit number", "phone-pad", false, true)}
            {renderInput("City", formData.city, "city", "map-marker", "New York", "default", false, true)}
            {renderInput("Full Address", formData.fullAddress, "fullAddress", "map-marker-radius", "Street, Area, Zip Code", "default", true, true)}
          </View>

          {/* Section 2: Caregiver-Specific Details (shown for caregiver type) */}
          {formData.serviceType === "caregiver" && (
            <View style={styles.card}>
              {renderSectionHeader("Caregiver Details", "hand-heart")}

              {renderInput(
                "Caregiving Services Offered",
                formData.caregivingServices,
                "caregivingServices",
                "medical-bag",
                "e.g. Elderly Care, Post-Surgery Care, Physiotherapy",
                "default",
                true,
                true
              )}
              {renderInput(
                "Types of Patients Considered",
                formData.patientTypes,
                "patientTypes",
                "account-group-outline",
                "e.g. Elderly, Post-surgical, Disabled, Bedridden",
                "default",
                true,
                true
              )}
              {renderInput(
                "Service Locations / Areas*",
                formData.serviceLocations,
                "serviceLocations",
                "map-marker-multiple-outline",
                "e.g. Mukkam, Kochi, Petta",
                "default",
                true
              )}
            </View>
          )}

          {/* Section 2b: Business Details */}
          <View style={styles.card}>
            {renderSectionHeader("Business Information", "certificate")}

            {renderInput("License #", formData.licenseNumber, "licenseNumber", "card-account-details-outline", "Optional")}
            {renderInput("Website", formData.website, "website", "earth", "https://yourwebsite.com", "url")}
            {renderInput("Operating Hours", formData.operatingHours, "operatingHours", "clock-outline", "e.g. 9 AM - 6 PM")}
            {renderInput("About Business", formData.aboutUs, "aboutUs", "information-outline", "Brief bio or description...", "default", true, true)}
          </View>

          {/* Section 3: Verification */}
          <View style={styles.card}>
            {renderSectionHeader("Professional Verification", "shield-check")}
            <Text style={styles.infoText}>Please upload a clear photo of your License Paper for admin verification.</Text>

            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              {licenseFile ? (
                licenseFile.mimeType?.startsWith("image/") ? (
                  <Image source={{ uri: licenseFile.uri }} style={styles.uploadedImage} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <MaterialCommunityIcons
                      name={licenseFile.name?.endsWith(".pdf") ? "file-pdf-box" : "file-word-box"}
                      size={50}
                      color="#ef4444"
                    />
                    <Text style={styles.fileNameText} numberOfLines={1}>{licenseFile.name}</Text>
                    <Text style={styles.uploadText}>Document Uploaded</Text>
                  </View>
                )
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <MaterialCommunityIcons name="cloud-upload-outline" size={40} color="#1D8FAB" />
                  <Text style={styles.uploadText}>Upload License Document *</Text>
                  <Text style={{ fontSize: 10, color: "#94a3b8" }}>(Image, PDF, or MS Word)</Text>
                </View>
              )}
            </TouchableOpacity>
            {licenseFile && (
              <TouchableOpacity onPress={() => setLicenseFile(null)} style={styles.removeText}>
                <Text style={{ color: "#ef4444", fontWeight: "600" }}>Change Document</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>SUBMIT FOR APPROVAL</Text>
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
    backgroundColor: "#F0F6F9",
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
    shadowColor: "#000",
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
  infoText: {
    fontSize: 13,
    color: "#4A7A8C",
    marginBottom: 15,
    lineHeight: 18,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: "#1D8FAB",
    borderStyle: "dashed",
    borderRadius: 16,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#E0F2F7",
  },
  uploadPlaceholder: {
    alignItems: "center",
  },
  uploadText: {
    marginTop: 10,
    color: "#0A5F7A",
    fontWeight: "600",
  },
  fileNameText: {
    fontSize: 14,
    color: "#0A3D52",
    fontWeight: "600",
    marginTop: 10,
    width: "80%",
    textAlign: "center",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeText: {
    alignSelf: "center",
    marginTop: 10,
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
