import express from "express";
import Video from "../models/Video.js";

const router = express.Router();

// GET videos by category
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.json({
        success: false,
        message: "Category is required.",
      });
    }

    const videos = await Video.find({ category });

    if (videos.length === 0) {
      return res.json({
        success: false,
        message: "No videos found for this category.",
      });
    }

    return res.json({
      success: true,
      videos,
    });

  } catch (err) {
    console.error("Video fetch error:", err);
    return res.json({
      success: false,
      message: "Server error.",
    });
  }
});

// ADMIN: Add a new video
router.post("/add", async (req, res) => {
  try {
    const { title, description, url, thumbnail, category } = req.body;

    if (!title || !url || !category) {
      return res.json({
        success: false,
        message: "Title, URL, and category are required.",
      });
    }

    const video = new Video({
      title,
      description,
      url,
      thumbnail,
      category,
    });

    await video.save();

    return res.json({
      success: true,
      message: "Video added successfully.",
    });

  } catch (err) {
    console.error("Video add error:", err);
    return res.json({
      success: false,
      message: "Server error.",
    });
  }
});

export default router;