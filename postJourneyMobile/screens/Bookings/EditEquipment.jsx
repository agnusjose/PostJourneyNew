import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Image, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
  cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
  textMuted: '#8AACB8', danger: '#C0392B', lightTeal: '#E0F2F7',
};

export default function EditEquipment({ route, navigation }) {
  const { equipment } = route.params;
  const BASE_URL = "http://10.63.72.99:5000";
  const [form, setForm] = useState({ equipmentName: equipment.equipmentName || "", description: equipment.description || "", pricePerDay: equipment.pricePerDay?.toString() || "", stock: equipment.stock?.toString() || "1", category: equipment.category || "other" });
  const [image, setImage] = useState(equipment.imageUrl ? { uri: equipment.imageUrl } : null);
  const [loading, setLoading] = useState(false);

  const categories = [
    { label: "Mobility Aids", value: "mobility", icon: "body-outline" },
    { label: "Respiratory", value: "respiratory", icon: "fitness-outline" },
    { label: "Daily Living", value: "daily-living", icon: "home-outline" },
    { label: "Therapeutic", value: "therapeutic", icon: "medkit-outline" },
    { label: "Monitoring", value: "monitoring", icon: "pulse-outline" },
    { label: "Beds", value: "beds", icon: "bed-outline" },
    { label: "Other", value: "other", icon: "ellipsis-horizontal-outline" },
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission required", "Please allow access to gallery"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!form.equipmentName.trim()) { Alert.alert("Error", "Please enter equipment name"); return; }
    if (!form.description.trim()) { Alert.alert("Error", "Please enter description"); return; }
    if (!form.pricePerDay || parseFloat(form.pricePerDay) <= 0) { Alert.alert("Error", "Please enter valid price per day"); return; }
    if (!form.stock || parseInt(form.stock) < 1) { Alert.alert("Error", "Please enter valid stock quantity"); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("equipmentName", form.equipmentName);
      formData.append("description", form.description);
      formData.append("pricePerDay", form.pricePerDay);
      formData.append("stock", form.stock);
      formData.append("category", form.category);
      if (image && image.uri !== equipment.imageUrl) { formData.append("image", { uri: image.uri, type: "image/jpeg", name: `equipment_${Date.now()}.jpg` }); }
      const response = await axios.put(`${BASE_URL}/equipment/update/${equipment._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (response.data.success) { Alert.alert("Success", "Equipment updated successfully"); navigation.goBack(); }
      else { Alert.alert("Error", response.data.message || "Failed to update equipment"); }
    } catch (error) { console.error("❌ Error:", error); Alert.alert("Error", error.response?.data?.message || "Failed to connect to server"); }
    finally { setLoading(false); }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdrG}>
        <View style={s.hdr}>
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
          <Text style={s.hdrT}>Edit Equipment</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.imgPicker} onPress={pickImage}>
            {image ? (<Image source={{ uri: image.uri }} style={s.preview} resizeMode="contain" />) : (
              <View style={s.phC}><View style={s.icnCircle}><Ionicons name="camera-outline" size={32} color={C.secondary} /></View>
                <Text style={s.phT}>Change Photo</Text><Text style={s.phS}>Tap to select image</Text></View>)}
            <View style={s.editIcn}><Ionicons name="pencil" size={16} color="#fff" /></View>
          </TouchableOpacity>
          <View style={s.formCard}>
            <View style={s.ig}><Text style={s.label}>Equipment Name</Text>
              <TextInput style={s.input} placeholder="e.g., Wheelchair, Oxygen Concentrator" placeholderTextColor={C.textMuted} value={form.equipmentName} onChangeText={(t) => setForm({ ...form, equipmentName: t })} /></View>
            <View style={s.ig}><Text style={s.label}>Description</Text>
              <TextInput style={[s.input, s.ta]} placeholder="Describe the equipment features, condition, specifications..." placeholderTextColor={C.textMuted} value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} multiline numberOfLines={4} textAlignVertical="top" /></View>
            <View style={s.row}>
              <View style={[s.ig, { flex: 1, marginRight: 8 }]}><Text style={s.label}>Price / Day (₹)</Text>
                <TextInput style={s.input} placeholder="0.00" placeholderTextColor={C.textMuted} value={form.pricePerDay} onChangeText={(t) => setForm({ ...form, pricePerDay: t })} keyboardType="decimal-pad" /></View>
              <View style={[s.ig, { flex: 1, marginLeft: 8 }]}><Text style={s.label}>Stock Qty</Text>
                <TextInput style={s.input} placeholder="1" placeholderTextColor={C.textMuted} value={form.stock} onChangeText={(t) => setForm({ ...form, stock: t })} keyboardType="number-pad" /></View>
            </View>
            <View style={s.ig}><Text style={s.label}>Category</Text>
              <View style={s.catC}>{categories.map((cat) => (
                <TouchableOpacity key={cat.value} style={[s.catBtn, form.category === cat.value && s.catBtnA]} onPress={() => setForm({ ...form, category: cat.value })}>
                  <Ionicons name={cat.icon} size={18} color={form.category === cat.value ? "#fff" : C.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={[s.catT, form.category === cat.value && s.catTA]}>{cat.label}</Text>
                </TouchableOpacity>))}</View></View>
          </View>
          <TouchableOpacity style={[s.subBtn, loading && s.subBtnD]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <LinearGradient colors={[C.primary, C.secondary]} style={s.subG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}><Text style={s.subT}>Update Equipment</Text></LinearGradient>}
          </TouchableOpacity>
          <TouchableOpacity style={s.delBtn} onPress={() => {
            Alert.alert("Delete Equipment", "Are you sure you want to delete this equipment?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete", style: "destructive", onPress: async () => {
                  try {
                    const response = await axios.delete(`${BASE_URL}/equipment/delete/${equipment._id}`);
                    if (response.data.success) { Alert.alert("Success", "Equipment deleted successfully"); navigation.goBack(); }
                  } catch (error) { Alert.alert("Error", "Failed to delete equipment"); }
                }
              }]);
          }}>
            <Ionicons name="trash-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={s.delT}>Delete Equipment</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdrG: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  hdr: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hdrT: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  imgPicker: { height: 250, backgroundColor: C.card, borderRadius: 18, marginBottom: 20, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.cardBorder, borderStyle: "dashed", position: 'relative', overflow: 'hidden' },
  preview: { width: "100%", height: "100%", backgroundColor: '#fff' },
  phC: { alignItems: "center" },
  icnCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.lightTeal, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  phT: { fontSize: 16, color: C.text, fontWeight: "700" },
  phS: { fontSize: 12, color: C.textSecondary, marginTop: 4 },
  editIcn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 },
  formCard: { backgroundColor: C.card, borderRadius: 18, padding: 20, elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 20 },
  ig: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: C.text },
  input: { backgroundColor: C.bg, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, fontSize: 15, color: C.text },
  ta: { minHeight: 120, paddingTop: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  catC: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.lightTeal, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder },
  catBtnA: { backgroundColor: C.primary, borderColor: C.primary },
  catT: { fontSize: 13, color: C.textSecondary, fontWeight: "600" },
  catTA: { color: "#fff" },
  subBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  subBtnD: { opacity: 0.6 },
  subG: { padding: 18, alignItems: "center" },
  subT: { color: "#fff", fontWeight: "700", fontSize: 16 },
  delBtn: { flexDirection: 'row', backgroundColor: C.danger, padding: 18, borderRadius: 15, alignItems: "center", justifyContent: 'center', shadowColor: C.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  delT: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
