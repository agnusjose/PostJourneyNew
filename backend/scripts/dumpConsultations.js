import mongoose from "mongoose";
import Consultation from "../models/Consultation.js";
import fs from "fs";

mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

async function dumpConsultations() {
    try {
        console.log("🔍 Fetching Consultations...");
        const consultations = await Consultation.find({});
        console.log(`✅ Total Consultations: ${consultations.length}`);

        fs.writeFileSync("consultations.json", JSON.stringify(consultations, null, 2));
        console.log("✅ Dumped to consultations.json");

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        mongoose.disconnect();
    }
}

setTimeout(dumpConsultations, 2000);