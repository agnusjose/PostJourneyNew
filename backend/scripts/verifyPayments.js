import mongoose from "mongoose";
import Consultation from "../models/Consultation.js";
import User from "../models/User.js";

mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

async function verifyPayments() {
    try {
        console.log("🔍 Checking Users...");
        // const patient = await User.findOne({ userType: "patient" });
        const patient = await User.findOne({ name: "Baina Elsa" });

        if (!patient) {
            console.log("❌ No patient found in database.");
            return;
        }

        const patientId = patient._id;
        console.log(`✅ Found Patient: ${patient.name} (${patientId})`);

        console.log("🔍 Checking specific consultation...");
        const specific = await Consultation.findOne({ patientName: "Baina Elsa Biju" });
        if (specific) {
            console.log(`Specific ID check: Expected ${specific.patientId}, Got User ID ${patientId}`);
            console.log(`Match? ${specific.patientId.equals(patientId)}`);
        } else {
            console.log("❌ No consultation found by name either.");
        }

        console.log("🔍 Fetching Consultations...");
        const consultations = await Consultation.find({ patientId });
        console.log(`✅ Found ${consultations.length} consultations.`);

        console.log("🔍 Simulating Payments Mapping...");
        const payments = consultations.map(c => ({
            _id: c._id,
            type: 'consultation',
            amount: c.totalFee || 0,
            status: c.paymentStatus === 'paid' ? 'successful' : 'failed',
            doctorName: c.doctorName,
            createdAt: c.createdAt,
            transactionId: c._id.toString().substring(0, 12).toUpperCase()
        }));

        console.log("✅ Payments Result:", JSON.stringify(payments, null, 2));

    } catch (error) {
        console.error("❌ Verification Error:", error);
    } finally {
        mongoose.disconnect();
    }
}

// Wait for connection
setTimeout(verifyPayments, 2000);