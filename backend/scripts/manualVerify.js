import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const verifyUser = async () => {
    const email = process.argv[2];

    if (!email) {
        console.log("❌ Please provide an email address.");
        console.log("Usage: node scripts/manualVerify.js <email>");
        process.exit(1);
    }

    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB");
        console.log("✅ MongoDB Connected");

        const users = await User.find({});
        console.log("Current users in DB:", users.map(u => `'${u.email}'`));

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            console.log(`❌ User '${email}' not found.`);
        } else {
            user.isVerified = true;
            user.otp = null;
            await user.save();
            console.log(`✅ User '${email}' has been Manually VERIFIED.`);
            console.log("try logging in now.");
        }

        mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

verifyUser();