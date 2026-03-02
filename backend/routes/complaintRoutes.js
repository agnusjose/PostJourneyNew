import express from "express";
import Complaint from "../models/Complaint.js";

const router = express.Router();

// ─── USER: Submit a complaint ─────────────────────────────────────────────────
router.post("/complaints", async (req, res) => {
    try {
        const { userId, userName, userType, subject, description } = req.body;

        if (!userId || !userName || !userType || !subject || !description) {
            return res.status(400).json({ success: false, error: "All fields are required." });
        }
        if (subject.trim().length < 5) {
            return res.status(400).json({ success: false, error: "Subject must be at least 5 characters." });
        }
        if (description.trim().length < 20) {
            return res.status(400).json({ success: false, error: "Description must be at least 20 characters." });
        }

        const complaint = new Complaint({ userId, userName, userType, subject: subject.trim(), description: description.trim() });
        await complaint.save();

        res.json({ success: true, message: "Complaint submitted successfully.", complaint });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── USER: Get own complaints ─────────────────────────────────────────────────
router.get("/complaints/user/:userId", async (req, res) => {
    try {
        const complaints = await Complaint.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ success: true, complaints });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── ADMIN: Get all complaints (with optional status filter) ──────────────────
router.get("/admin/complaints", async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status && status !== "all" ? { status } : {};
        const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, complaints });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── ADMIN: Reply to a complaint ─────────────────────────────────────────────
router.patch("/admin/complaints/:id/reply", async (req, res) => {
    try {
        const { reply, status } = req.body;
        if (!reply || !reply.trim()) {
            return res.status(400).json({ success: false, error: "Reply cannot be empty." });
        }

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            {
                adminReply: reply.trim(),
                repliedAt: new Date(),
                status: status || "reviewed",
            },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({ success: false, error: "Complaint not found." });
        }

        res.json({ success: true, complaint });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── ADMIN: Update complaint status only ─────────────────────────────────────
router.patch("/admin/complaints/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ["pending", "reviewed", "resolved", "dismissed"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, error: "Invalid status." });
        }

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json({ success: true, complaint });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
