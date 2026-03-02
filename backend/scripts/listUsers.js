import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const listUsers = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB");
        console.log("✅ MongoDB Connected");

        const users = await User.find({}, "name email userType isVerified createdAt");

        console.log("\n📋 --- List of Registered Users ---");
        if (users.length === 0) {
            console.log("Empty database (No users found)");
        } else {
            users.forEach(u => {
                console.log(`- [${u.userType}] ${u.name} (${u.email}) | Verified: ${u.isVerified} | Created: ${u.createdAt.toISOString().split('T')[0]}`);
            });
        }
        console.log("----------------------------------\n");

        mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

listUsers();