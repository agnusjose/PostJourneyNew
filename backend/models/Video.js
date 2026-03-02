import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema({
  title: String,
  description: String,
  url: String,
  thumbnail: String,
  category: String,
});

export default mongoose.model("Video", VideoSchema);
