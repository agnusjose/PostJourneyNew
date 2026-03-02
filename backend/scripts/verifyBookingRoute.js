import axios from 'axios';
import mongoose from 'mongoose';
import User from '../models/User.js'; // Ensure this path is correct relative to scripts folder

// Connect to MongoDB to get a user ID
mongoose.connect("mongodb://127.0.0.1:27017/postJourneyDB")
    .then(async () => {
        console.log("✅ MongoDB Connected");

        try {
            // Find the user
            const user = await User.findOne({ email: "bainaelsa@gmail.com" });

            if (!user) {
                console.log("❌ User bainaelsa@gmail.com not found");
                process.exit(1);
            }

            console.log(`👤 Found user: ${user.name} (${user._id})`);
            const userId = user._id.toString();
            const BASE_URL = "http://172.16.230.150:5000";

            console.log(`📡 Testing endpoint: ${BASE_URL}/booking/patient/${userId}`);

            // Test the endpoint
            try {
                const response = await axios.get(`${BASE_URL}/booking/patient/${userId}`);
                console.log("✅ API Response Status:", response.status);
                console.log("📊 Success:", response.data.success);
                console.log("📄 Bookings count:", response.data.bookings ? response.data.bookings.length : 0);
                if (response.data.bookings && response.data.bookings.length > 0) {
                    console.log("First booking equipment:", response.data.bookings[0].equipmentId);
                }
            } catch (err) {
                console.error("❌ API Call Failed:");
                if (err.response) {
                    console.error(`Status: ${err.response.status}`);
                    console.error("Data:", err.response.data);
                } else {
                    console.error(err.message);
                    console.error("Stack:", err.stack);
                }
            }

        } catch (err) {
            console.error("❌ Script Error:", err);
        } finally {
            await mongoose.disconnect();
            console.log("✅ MongoDB Disconnected");
        }
    })
    .catch(err => console.error("❌ MongoDB Connection Error:", err));