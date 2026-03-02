import express from "express";
import Video from "../models/Video.js";
import axios from "axios";

const router = express.Router();

/* --------------------------------------------------------------------------
   ADD NEW VIDEO
   Endpoint: POST /api/videos/add
-------------------------------------------------------------------------- */
router.post("/videos/add", async (req, res) => {
  try {
    const { title, description, url, category } = req.body;

    if (!title || !url || !category) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    // Extract YouTube video ID
    let id = "";
    if (url.includes("v=")) {
      id = url.split("v=")[1];
    } else if (url.includes("youtu.be")) {
      id = url.split("youtu.be/")[1];
    } else {
      return res.json({ success: false, message: "Invalid YouTube URL" });
    }

    const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

    const video = new Video({
      title,
      description,
      url,
      thumbnail,
      category,
    });

    await video.save();

    return res.json({ success: true, video });
  } catch (error) {
    console.error("Error adding video:", error);
    return res.json({ success: false, message: "Server error" });
  }
});

/* --------------------------------------------------------------------------
   GET ALL VIDEOS
   Endpoint: GET /api/videos
-------------------------------------------------------------------------- */
router.get("/videos", async (req, res) => {
  try {
    const videos = await Video.find();
    return res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return res.json({ success: false });
  }
});

/* --------------------------------------------------------------------------
   GET VIDEOS BY CATEGORY
   Endpoint: GET /api/videos/category/:category
-------------------------------------------------------------------------- */
router.get("/videos/category/:category", async (req, res) => {
  try {
    const category = req.params.category;
    console.log("REQUESTED CATEGORY:", category);

    const videos = await Video.find({ category });

    return res.json(videos);
  } catch (error) {
    console.error("Error fetching category videos:", error);
    return res.json({ success: false });
  }
});

export default router;