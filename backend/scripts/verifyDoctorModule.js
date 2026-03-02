import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const verify = async () => {
    try {
        console.log("🔍 Verifying Doctor Module...");

        // 1. Get Doctors
        console.log("\n1️⃣  Fetching Doctors...");
        const doctorsRes = await axios.get(`${BASE_URL}/doctors`);
        console.log(`✅ Found ${doctorsRes.data.length} doctors.`);

        if (doctorsRes.data.length === 0) {
            console.error("❌ No doctors found. Verification stopped.");
            return;
        }

        const doctor = doctorsRes.data[0];
        console.log(`   Using Doctor: ${doctor.name} (ID: ${doctor._id})`);

        // 2. Book Consultation
        console.log("\n2️⃣  Booking Consultation...");
        const bookingData = {
            patientId: "5f50c31e1c9d440000000000", // Dummy Object ID
            patientName: "Test Patient",
            doctorId: doctor._id,
            problem: "Migraine",
            date: new Date().toISOString()
        };

        const bookingRes = await axios.post(`${BASE_URL}/book-consultation`, bookingData);
        console.log("✅ Booking Response:", bookingRes.data);

        console.log("\n🎉 Verification Complete!");

    } catch (error) {
        console.error("❌ Verification Failed:", error.message);
        if (error.response) {
            console.error("   Response Data:", error.response.data);
        }
    }
};

verify();