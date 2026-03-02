import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";

const checkDoctors = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB");
        console.log("✅ MongoDB Connected");

        const doctors = await Doctor.find({});

        console.log("\n👨‍⚕️ --- List of Doctors in Database ---");
        if (doctors.length === 0) {
            console.log("Empty database (No doctors found)");
        } else {
            doctors.forEach(d => {
                console.log(`- ${d.name} | Specialization: ${d.specialization} | Experience: ${d.experience} years`);
            });
        }
        console.log("---------------------------------------\n");

        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error);
    }
};

checkDoctors();