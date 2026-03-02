import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary: "#0A5F7A",   // deep teal
  secondary: "#1D8FAB",   // teal
  accent: "#2EC4B6",   // mint
  surface: "#FFFFFF",
  bg: "#F0F6F9",
  textDark: "#0D2535",
  textMid: "#4A6B7C",
  textLight: "#8BA9B8",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  cardBorder: "#DBE8EE",
};

// ── YouTube helpers ────────────────────────────────────────────────────────────
const youtubeapi = "AIzaSyCmaXSuKlyQyZg8vbzq4gOkOb3IEisahD0";

// ── Quick Actions config ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    id: "videos",
    icon: "play-circle-outline",
    label: "Health Videos",
    sub: "Expert guidance",
    color: "#0A5F7A",
    bg: "#E6F3F7",
    screen: "MedicalVideos",
  },
  {
    id: "services",
    icon: "stethoscope",
    label: "Services",
    sub: "Book care services",
    color: "#7C3AED",
    bg: "#F3EEFF",
    screen: "ServiceBookingScreen",
  },
  {
    id: "consult",
    icon: "doctor",
    label: "Consult Doctor",
    sub: "Book a session",
    color: "#059669",
    bg: "#ECFDF5",
    screen: "PatientConsultations",
  },
  {
    id: "complaints",
    icon: "flag-outline",
    label: "Complaints",
    sub: "Submit feedback",
    color: "#DC6803",
    bg: "#FFF7ED",
    isComplaint: true,
  },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function PatientDashboard({ navigation, route }) {
  const [videos, setVideos] = useState([]);
  const { userName, userId, userEmail } = route.params;
  const { logout } = useAuth();

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good Morning" : currentHour < 16 ? "Good Afternoon" : "Good Evening";

  useEffect(() => {
    fetchVideoTitles();
  }, []);

  const fetchVideoTitles = async () => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&videoDuration=medium&q=medical+rehabilitation+exercise+demonstration&key=${youtubeapi}`
      );
      const data = await response.json();
      if (!data.items) return;
      const shuffled = data.items.sort(() => 0.5 - Math.random()).slice(0, 5);
      setVideos(
        shuffled.map((item) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        }))
      );
    } catch (error) {
      console.log("YouTube fetch error:", error);
    }
  };

  const openYoutube = async (url) => {
    try { await Linking.openURL(url); }
    catch { Alert.alert("Error", "Cannot open this video"); }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          navigation.replace("LoginScreen");
        },
      },
    ]);
  };

  const handleAction = (action) => {
    if (action.isComplaint) {
      navigation.navigate("ComplaintsScreen", { userId, userName, userType: "patient" });
    } else {
      navigation.navigate(action.screen);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        {/* top row */}
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.heroName}>{userName || "Patient"}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() =>
              navigation.navigate("PatientProfileScreen", { userId, userEmail })
            }
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {(userName || "P").charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileBtnLabel}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Health status strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="heart-pulse" size={18} color={C.accent} />
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>Active</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="calendar-check" size={18} color={C.accent} />
            <Text style={styles.statusLabel}>Plan</Text>
            <Text style={styles.statusValue}>Recovery</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="shield-check" size={18} color={C.accent} />
            <Text style={styles.statusLabel}>Care</Text>
            <Text style={styles.statusValue}>Verified</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ── AI Monitoring Card ───────────────────────────────────── */}
        <LinearGradient
          colors={["#0A5F7A", "#118698"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiCard}
        >
          <View style={styles.aiCardLeft}>
            <View style={styles.aiIconBadge}>
              <MaterialCommunityIcons name="brain" size={24} color="#fff" />
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={styles.aiCardTitle}>AI Exercise Monitor</Text>
              <Text style={styles.aiCardSub}>
                Real-time posture tracking & movement accuracy
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.aiStartBtn}
            onPress={() => navigation.navigate("ExercisesDashboard")}
          >
            <MaterialCommunityIcons name="play" size={18} color={C.primary} />
            <Text style={styles.aiStartBtnText}>Start</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Quick Actions ────────────────────────────────────────── */}
        <SectionHeader title="Quick Actions" icon="lightning-bolt" />
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={() => handleAction(action)}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                <MaterialCommunityIcons name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionSub}>{action.sub}</Text>
              <View style={[styles.actionArrow, { backgroundColor: action.bg }]}>
                <MaterialCommunityIcons name="arrow-right" size={12} color={action.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Care Tip ─────────────────────────────────────────────── */}
        <View style={styles.tipCard}>
          <LinearGradient
            colors={["#E6F9F5", "#F0FBF9"]}
            style={styles.tipGradient}
          >
            <View style={styles.tipLeft}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={28} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Daily Care Tip</Text>
              <Text style={styles.tipText}>
                Perform exercises in a well-lit area. Proper lighting helps the AI track your joint angles with higher precision for better results.
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Recommended Videos ───────────────────────────────────── */}
        {videos.length > 0 && (
          <>
            <SectionHeader title="Health Videos" icon="youtube" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.videoScroll}
              contentContainerStyle={{ paddingLeft: 4 }}
            >
              {videos.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  onPress={() => openYoutube(video.url)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: video.thumbnail }}
                    style={styles.videoThumb}
                  />
                  <View style={styles.playOverlay}>
                    <MaterialCommunityIcons name="play-circle" size={36} color="rgba(255,255,255,0.9)" />
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoText} numberOfLines={2}>
                      {video.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Logout ───────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout-variant" size={18} color={C.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>PostJourney Health · Your Recovery Partner</Text>
      </ScrollView>
    </View>
  );
}

// ── Small helper component ─────────────────────────────────────────────────────
function SectionHeader({ title, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={16} color={C.secondary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const CARD_W = (width - 48 - 12) / 2; // 2 cols, 24px padding each side, 12px gap

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    paddingTop: Platform.OS === "ios" ? 56 : StatusBar.currentHeight + 16,
    paddingBottom: 28,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  greeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  profileBtn: { alignItems: "center" },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarLetter: { fontSize: 18, fontWeight: "800", color: "#fff" },
  profileBtnLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "600" },

  // Status strip
  statusStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statusItem: { flex: 1, alignItems: "center", gap: 2 },
  statusDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  statusLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600", marginTop: 3 },
  statusValue: { fontSize: 12, color: "#fff", fontWeight: "700" },

  // Body
  body: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 50 },

  // AI Card
  aiCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderRadius: 20,
    padding: 20,
    marginBottom: 26,
    elevation: 6,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
  aiCardLeft: { flex: 1, paddingRight: 12 },
  aiIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
    marginBottom: 5,
  },
  aiCardSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 17,
    fontWeight: "500",
  },
  aiStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 5,
  },
  aiStartBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.primary,
    letterSpacing: 0.3,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textDark,
    letterSpacing: 0.2,
  },

  // Quick Actions grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 26,
  },
  actionCard: {
    width: CARD_W,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    elevation: 2,
    shadowColor: "#0D2535",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  actionSub: {
    fontSize: 11,
    color: C.textLight,
    fontWeight: "500",
    marginBottom: 12,
  },
  actionArrow: {
    width: 22,
    height: 22,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Tip card
  tipCard: {
    borderRadius: 18,
    marginBottom: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#C6EFE6",
  },
  tipGradient: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 14,
  },
  tipLeft: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  tipText: {
    fontSize: 12,
    color: "#094d38",
    lineHeight: 18,
    fontWeight: "500",
  },

  // Videos
  videoScroll: { marginBottom: 26 },
  videoCard: {
    width: 200,
    backgroundColor: C.surface,
    borderRadius: 16,
    marginRight: 14,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#0D2535",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  videoThumb: { width: "100%", height: 110, backgroundColor: "#CBD5DC" },
  playOverlay: {
    position: "absolute",
    top: 37,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  videoInfo: { padding: 12 },
  videoText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textDark,
    lineHeight: 17,
  },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "#FFF5F5",
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: C.danger },

  // Footer
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: C.textLight,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
