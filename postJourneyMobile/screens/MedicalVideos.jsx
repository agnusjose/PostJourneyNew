import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";

const API_BASE = "http://172.16.230.150:5000";
const C = { primary: "#0A5F7A", secondary: "#1D8FAB", bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C", textLight: "#8BA9B8", cardBorder: "#DBE8EE" };

export default function MedicalVideos({ navigation }) {
  const [dbVideos, setDbVideos] = useState([]);
  const [ytVideos, setYtVideos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/api/videos`).then(res => setDbVideos(res.data || [])).catch(() => console.log("Failed to load DB videos"));
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) { setYtVideos([]); return; }
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/youtube/search?q=${encodeURIComponent(search)}`);
      setYtVideos(res.data || []);
    } catch { alert("Failed to fetch videos"); }
    finally { setLoading(false); }
  };

  const showingYouTube = search.trim().length > 0;
  const displayVideos = showingYouTube ? ytVideos : dbVideos;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.canGoBack() && navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroCenter}>
          <MaterialCommunityIcons name="play-circle-outline" size={36} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroTitle}>Health Videos</Text>
          <Text style={styles.heroSub}>Medical demonstrations & guidance</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Search medical videos..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor={C.textLight}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 24 }} />}

        {displayVideos.length > 0 && (
          <Text style={styles.sectionTitle}>
            {showingYouTube ? `Results for "${search}"` : "Featured Videos"}
          </Text>
        )}

        {displayVideos.map(video => (
          <TouchableOpacity
            key={video._id || video.videoId}
            style={styles.card}
            onPress={() => navigation.navigate("VideoPlayer", { url: video.url || `https://www.youtube.com/watch?v=${video.videoId}` })}
          >
            <Image source={{ uri: video.thumbnail }} style={styles.thumb} />
            <View style={styles.playBadge}>
              <MaterialCommunityIcons name="play" size={20} color="#fff" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{video.title}</Text>
              {video.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{video.description}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}

        {!loading && displayVideos.length === 0 && (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="video-off-outline" size={48} color={C.textLight} />
            <Text style={styles.emptyText}>{showingYouTube ? "No results found" : "No videos available"}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hero: { paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12, paddingBottom: 24, paddingHorizontal: 18 },
  backBtn: { marginBottom: 12 },
  heroCenter: { alignItems: "center" },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 8, letterSpacing: -0.3 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 4 },
  body: { padding: 18, paddingBottom: 40 },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark, borderWidth: 1, borderColor: C.cardBorder, fontWeight: "500" },
  searchBtn: { backgroundColor: C.primary, borderRadius: 12, width: 46, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: C.textDark, marginBottom: 14, letterSpacing: 0.1 },
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: C.cardBorder, overflow: "hidden", elevation: 2 },
  thumb: { height: 180, width: "100%", backgroundColor: "#CBD5DC" },
  playBadge: { position: "absolute", top: 72, left: 0, right: 0, alignItems: "center" },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: C.textDark, lineHeight: 20, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: C.textMid, lineHeight: 18 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: "600", color: C.textLight },
});