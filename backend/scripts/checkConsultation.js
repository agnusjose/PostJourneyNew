import mongoose from "mongoose";
import Consultation from "../models/Consultation.js";

mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

async function checkConsultations() {
    try {
        console.log("🔍 Checking Consultations...");
        const consultations = await Consultation.find({});
        console.log(`✅ Total Consultations: ${consultations.length}`);

        if (consultations.length > 0) {
            console.log("Found Consultations for:");
            consultations.forEach(c => {
                console.log(`- Patient: "${c.patientName}" (ID: ${c.patientId})`);
                console.log(`  Doctor: "${c.doctorName}"`);
            });
        } else {
            console.log("❌ No consultations found in DB.");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        mongoose.disconnect();
    }
}

setTimeout(checkConsultations, 2000);