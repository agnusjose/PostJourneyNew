import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
// Helper functions for validation
const validateEmail = (email) => {
    const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return regex.test(email);
};

const validatePassword = (password) => {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
    return regex.test(password);
};

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, userType } = req.body;

    if (!/^[A-Za-z\s]+$/.test(name)) {
        return res.status(400).json({ message: "Name must contain only letters" });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email" });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character" });
    }
    if (!['patient', 'service provider'].includes(userType)) {
        return res.status(400).json({ message: "Invalid user type" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, userType });
        await newUser.save();

        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        res.status(200).json({ message: "Login successful", user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user with userType 'admin'
    const admin = await User.findOne({ email, userType: "admin" });
    if (!admin) {
      return res.status(400).json({ success: false, message: "Not an admin account" });
    }

    // Compare password (bcrypt)
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect password" });
    }

    // Successful login
    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      admin: { id: admin._id, email: admin.email, name: admin.name }
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
