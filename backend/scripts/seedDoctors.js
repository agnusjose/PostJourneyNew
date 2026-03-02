import mongoose from "mongoose";
import dotenv from "dotenv";
import Doctor from "../models/Doctor.js";

dotenv.config({ path: "../.env" }); // Adjust path if needed

const doctors = [
    {
        name: "Dr. Sarah Johnson",
        specialization: "Physiotherapist",
        email: "sarah.johnson@postjourney.com",
        phone: "123-456-7890",
        fee: 500,
        image: ""
    },
    {
        name: "Dr. Michael Chen",
        specialization: "Orthopedic Surgeon",
        email: "michael.chen@postjourney.com",
        phone: "987-654-3210",
        fee: 1200,
        image: ""
    },
    {
        name: "Dr. Emily Davis",
        specialization: "Neurologist",
        email: "emily.davis@postjourney.com",
        phone: "555-123-4567",
        fee: 1500,
        image: ""
    },
    {
        name: "Dr. Robert Wilson",
        specialization: "Rehabilitation Specialist",
        email: "robert.wilson@postjourney.com",
        phone: "444-555-6666",
        fee: 800,
        image: ""
    },
    {
        name: "Dr. Linda Taylor",
        specialization: "Psychologist",
        email: "linda.taylor@postjourney.com",
        phone: "777-888-9999",
        fee: 1000,
        image: ""
    }
];

const seedDoctors = async () => {
    try {
        // Connect to MongoDB - use the same connection string as server.js
        await mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB Connected for Seeding");

        // Clear existing doctors
        await Doctor.deleteMany({});
        console.log("🗑️  Cleared existing doctors");

        // Insert new doctors
        await Doctor.insertMany(doctors);
        console.log("🌱 Doctors seeded successfully");

        mongoose.disconnect();
        console.log("👋 Database Disconnected");
    } catch (error) {
        console.error("❌ Seeding Error:", error);
        process.exit(1);
    }
};

seedDoctors();