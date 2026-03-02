import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";

const clearDoctors = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB");
        console.log("✅ MongoDB Connected");

        const result = await Doctor.deleteMany({});
        console.log(`🗑️ Deleted ${result.deletedCount} doctors.`);

        await mongoose.disconnect();
        console.log("✅ MongoDB Disconnected");
    } catch (error) {
        console.error("❌ Error:", error);
    }
};

clearDoctors();