import express from "express";
import axios from "axios";

const router = express.Router();

// 🔒 Block obvious non-medical searches
const BLOCKED_KEYWORDS = [
  "song",
  "movie",
  "trailer",
  "lyrics",
  "dance",
  "music",
  "album",
  "cinema",
  "film",
];

// 🧠 Medical context injected into every search
const MEDICAL_CONTEXT =
  "medical health first aid treatment recovery physiotherapy hospital clinical education";

// 🎯 YouTube topic IDs related to medicine / health
const MEDICAL_TOPIC_ID = "/m/01w5h"; // Medicine

router.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: "Search query required" });
  }

  // 🔎 Basic keyword blocking
  const lowerQuery = q.toLowerCase();
  if (BLOCKED_KEYWORDS.some(word => lowerQuery.includes(word))) {
    return res.json([]); // silently return nothing
  }

  // 🧬 Inject medical intent into query
  const searchQuery = `${q} ${MEDICAL_CONTEXT}`;

  try {
    const ytRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: searchQuery,
          type: "video",
          maxResults: 10,
          topicId: MEDICAL_TOPIC_ID,
          safeSearch: "strict",
          relevanceLanguage: "en",
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    // 🧹 Clean + normalize response
    const videos = ytRes.data.items
      .filter(item => item.id.videoId) // safety check
      .map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high?.url
          || item.snippet.thumbnails.default?.url,
      }));

    res.json(videos);

  } catch (err) {
    console.error("YouTube API Error:", err.response?.data || err.message);
    res.status(500).json({ message: "YouTube fetch failed" });
  }
});

export default router;