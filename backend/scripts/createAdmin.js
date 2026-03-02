import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/postJourneyDB";

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const email = "admin@gmail.com";
    const password = "Admin@123";

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log("Admin already exists:", email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new User({
      name: "Admin",
      email: email,
      password: hashedPassword,
      userType: "admin",
    });

    await admin.save();

    console.log("Admin user created:", email);
    process.exit(0);

  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
}

createAdmin();