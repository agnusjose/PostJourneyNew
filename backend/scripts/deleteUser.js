import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const deleteUser = async () => {
    const email = process.argv[2];

    if (!email) {
        console.log("❌ Please provide an email address.");
        console.log("Usage: node scripts/deleteUser.js <email>");
        process.exit(1);
    }

    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB");
        console.log("✅ MongoDB Connected");

        const user = await User.findOneAndDelete({ email: email.toLowerCase() });

        if (user) {
            console.log(`✅ User '${email}' deleted successfully.`);

            // Cleanup associated equipment if it's a provider
            if (user.userType === "service-provider" || user.userType === "service provider" || user.userType === "provider") {
                const Equipment = (await import("../models/Equipment.js")).default;
                const result = await Equipment.deleteMany({ providerId: user._id });
                console.log(`🗑️ Deleted ${result.deletedCount} equipment items for this provider.`);
            }
        } else {
            console.log(`❌ User '${email}' not found.`);
        }

        mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

deleteUser();