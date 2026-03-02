import React, { useState } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ConsultDoctor from "./ConsultDoctor";
import MyConsultations from "./MyConsultations";
import PatientDocuments from "./PatientDocuments";
import PatientPaymentHistory from "./PatientPaymentHistory";
import { useAuth } from "../context/AuthContext";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9",
    textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE",
};

const TABS = [
    { key: "book", label: "Book", icon: "stethoscope" },
    { key: "my", label: "Consultations", icon: "clipboard-list-outline" },
    { key: "records", label: "Records", icon: "folder-outline" },
    { key: "payments", label: "Payments", icon: "credit-card-outline" },
];

export default function PatientConsultations({ navigation, route }) {
    const [activeTab, setActiveTab] = useState("book");
    const { user } = useAuth();
    const userId = user?.userId || route?.params?.userId;
    const userName = user?.name || route?.params?.userName;
    const documentsRoute = { params: { userId, userName } };
    const paymentsRoute = { params: { userId } };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />

            {/* Gradient Header */}
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <MaterialCommunityIcons name="stethoscope" size={18} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.headerTitle}>Consultations</Text>
                </View>
                <View style={{ width: 36 }} />
            </LinearGradient>

            {/* Tab Bar */}
            <View style={styles.tabBarWrap}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabBarScroll}
                >
                    {TABS.map(tab => {
                        const active = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.tab, active && styles.tabActive]}
                                onPress={() => setActiveTab(tab.key)}
                                activeOpacity={0.8}
                            >
                                <MaterialCommunityIcons
                                    name={tab.icon}
                                    size={15}
                                    color={active ? "#fff" : C.textLight}
                                />
                                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                {activeTab === "book" && <ConsultDoctor navigation={navigation} route={route} embedded={true} />}
                {activeTab === "my" && <MyConsultations navigation={navigation} route={route} embedded={true} />}
                {activeTab === "records" && <PatientDocuments navigation={navigation} route={documentsRoute} embedded={true} />}
                {activeTab === "payments" && <PatientPaymentHistory navigation={navigation} route={paymentsRoute} embedded={true} />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12,
        paddingBottom: 16,
        paddingHorizontal: 18,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.18)",
        justifyContent: "center", alignItems: "center",
    },
    headerCenter: {
        flex: 1, flexDirection: "row", alignItems: "center",
        justifyContent: "center", gap: 8,
    },
    headerTitle: {
        fontSize: 17, fontWeight: "800", color: "#fff", letterSpacing: -0.2,
    },

    // Tab Bar
    tabBarWrap: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: C.cardBorder,
        elevation: 2,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    tabBarScroll: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    tab: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.cardBorder,
    },
    tabActive: {
        backgroundColor: C.primary,
        borderColor: C.primary,
    },
    tabText: {
        fontSize: 12,
        fontWeight: "700",
        color: C.textLight,
        letterSpacing: 0.1,
    },
    tabTextActive: {
        color: "#fff",
    },

    // Content
    content: { flex: 1, backgroundColor: C.bg },
});
