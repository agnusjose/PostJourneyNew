/**
 * create_doctor.js
 * Run once to seed the fixed doctor account into MongoDB.
 * Usage: node create_doctor.js
 *
 * This creates/updates the single fixed doctor account.
 * Doctor accounts are NOT created through the app — only via this script.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

// Load environment variables from .env
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ MONGO_URI not found in .env file. Aborting.");
    process.exit(1);
}

const DOCTOR = {
    name: "Dr. Nimmy Shaji",
    email: "nimmyshaji09@gmail.com",
    password: "Bainaelsa@123#",
    userType: "doctor",
    isVerified: true,
    profileCompleted: true,
    specialization: "General Practitioner",
    experience: "10 Years",
    consultationFee: 100,
    qualification: "MBBS, MD",
    languages: "English, Hindi, Malayalam",
    about: "Experienced general practitioner dedicated to patient care.",
    isOnline: true,
};

const createDoctor = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB:", MONGO_URI);

        // Hash password
        const hashedPassword = await bcrypt.hash(DOCTOR.password, 10);

        // Check if doctor already exists
        let user = await User.findOne({ email: DOCTOR.email });

        if (user) {
            console.log("⚠️  Doctor already exists. Updating details...");

            // Update all doctor fields
            user.name = DOCTOR.name;
            user.password = hashedPassword;
            user.userType = DOCTOR.userType;
            user.isVerified = DOCTOR.isVerified;
            user.profileCompleted = DOCTOR.profileCompleted;
            user.specialization = DOCTOR.specialization;
            user.experience = DOCTOR.experience;
            user.consultationFee = DOCTOR.consultationFee;
            user.qualification = DOCTOR.qualification;
            user.languages = DOCTOR.languages;
            user.about = DOCTOR.about;
            user.isOnline = DOCTOR.isOnline;

            // Clear providerProfile to avoid contamination from old data
            user.providerProfile = undefined;
            user.patientProfile = undefined;

            await user.save();
            console.log("✅ Doctor account updated successfully!");
        } else {
            // Create new doctor user
            user = new User({
                name: DOCTOR.name,
                email: DOCTOR.email,
                password: hashedPassword,
                userType: DOCTOR.userType,
                isVerified: DOCTOR.isVerified,
                profileCompleted: DOCTOR.profileCompleted,
                specialization: DOCTOR.specialization,
                experience: DOCTOR.experience,
                consultationFee: DOCTOR.consultationFee,
                qualification: DOCTOR.qualification,
                languages: DOCTOR.languages,
                about: DOCTOR.about,
                isOnline: DOCTOR.isOnline,
            });

            await user.save();
            console.log("✅ Doctor account created successfully!");
        }

        console.log("\n📋 Doctor Account Details:");
        console.log("   Name       :", DOCTOR.name);
        console.log("   Email      :", DOCTOR.email);
        console.log("   Password   :", DOCTOR.password);
        console.log("   UserType   :", DOCTOR.userType);
        console.log("   MongoDB ID :", user._id.toString());
        console.log("\n🔑 Use these credentials to log in as the doctor.");

        process.exit(0);
    } catch (err) {
        console.error("❌ Error creating doctor:", err.message);
        process.exit(1);
    }
};

createDoctor();
