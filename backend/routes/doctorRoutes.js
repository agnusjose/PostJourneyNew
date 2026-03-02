import express from "express";
import User from "../models/User.js";
import Consultation from "../models/Consultation.js";

const router = express.Router();

// 🔹 Get all available doctors (for patients)
router.get("/doctors/available", async (req, res) => {
    try {
        const doctors = await User.find({ userType: "doctor", profileCompleted: true })
            .select("name specialization experience consultationFee about doctorImage qualification languages isOnline");
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Get available slots for a doctor on a specific date
router.get("/doctors/:id/slots", async (req, res) => {
    try {
        const { date } = req.query;
        const doctorId = req.params.id;

        if (!date) {
            return res.status(400).json({ success: false, error: "Date is required" });
        }

        // Fixed slots: 10 AM to 6 PM
        const allSlots = [
            "10:00 AM", "11:00 AM", "12:00 PM",
            "01:00 PM", "02:00 PM", "03:00 PM",
            "04:00 PM", "05:00 PM"
        ];

        // Find booked slots for this doctor on this date
        const bookedConsultations = await Consultation.find({
            doctorId,
            consultationDate: new Date(date),
            status: { $ne: "cancelled" }
        }).select("timeSlot");

        const bookedSlots = bookedConsultations.map(c => c.timeSlot);

        // Return slots with availability status
        const slotsWithStatus = allSlots.map(slot => ({
            time: slot,
            isBooked: bookedSlots.includes(slot)
        }));

        res.json(slotsWithStatus);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Book consultation + simulate payment (Fixed for mobile)
router.post("/book-consultation", async (req, res) => {
    try {
        const { patientId, patientName, doctorId, problem, date, timeSlot } = req.body;
        console.log("🔍 Book Consultation Request Body:", req.body);

        if (!patientId || !doctorId || !timeSlot || !date) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        // Check if slot is still available
        const existing = await Consultation.findOne({
            doctorId,
            consultationDate: new Date(date),
            timeSlot,
            status: { $ne: "cancelled" }
        });

        if (existing) {
            return res.status(400).json({ success: false, error: "This slot is already booked." });
        }

        const doctor = await User.findById(doctorId);
        if (!doctor) return res.status(404).json({ success: false, error: "Doctor not found" });

        // 💳 Payment simulation
        const totalFee = doctor.consultationFee || 0;
        const adminFee = totalFee * 0.2; // 20% admin commission
        const doctorFee = totalFee - adminFee;

        const consultation = new Consultation({
            patientId,
            patientName,
            doctorId,
            doctorName: doctor.name,
            problemDescription: problem,
            consultationDate: date,
            timeSlot,
            totalFee,
            adminCommission: adminFee,
            doctorShare: doctorFee,
            paymentStatus: "paid"
        });

        console.log("📝 Creating Consultation:", consultation);

        await consultation.save();

        // 🔹 Create mock transaction object for mobile success screen consistency
        const transaction = {
            _id: consultation._id,
            id: consultation._id,
            transactionId: `CONSULT-${consultation._id.toString().substring(0, 8).toUpperCase()}`,
            status: "completed",
            amount: totalFee,
            paymentMethod: req.body.paymentMethod || "upi",
            createdAt: consultation.createdAt
        };

        res.json({
            success: true,
            message: "Consultation booked successfully!",
            transaction,
            bookingId: consultation._id
        });

    } catch (err) {
        console.error("❌ Booking Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Get Doctor's Consultations (for dashboard)
router.get("/doctor/:id/consultations", async (req, res) => {
    try {
        const consultations = await Consultation.find({ doctorId: req.params.id })
            .sort({ consultationDate: 1, timeSlot: 1 });
        res.json(consultations);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Get Patient's Consultations (for reminders/list)
router.get("/patient/:id/consultations", async (req, res) => {
    try {
        const consultations = await Consultation.find({ patientId: req.params.id })
            .sort({ consultationDate: 1, timeSlot: 1 });
        res.json(consultations);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Add a new doctor (Legacy support, though typically handled via registration)
router.post("/add-doctor", async (req, res) => {
    try {
        const { name, specialization, email, phone, fee, image } = req.body;

        if (!name || !specialization || !email || !phone || !fee) {
            return res.status(400).json({ success: false, error: "All fields are required" });
        }

        // Ideally, we should check if a User already exists or create a User
        // But for consistency with existing "Doctor" implementation if any:
        // We'll just return 400 and say "Doctor should be registered as a user"
        res.status(400).json({ success: false, error: "New doctors must register via the user registration flow." });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Update Doctor Online Status
router.put("/doctor/:id/status", async (req, res) => {
    try {
        const { isOnline } = req.body;
        await User.findByIdAndUpdate(req.params.id, { isOnline });
        res.json({ success: true, message: "Status updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Update Consultation Notes (Doctor only)
router.post("/consultation/:id/notes", async (req, res) => {
    try {
        const { diagnosis, medicines, exerciseAdvice, followUpDate, generalComments } = req.body;

        // Validate followUpDate if provided
        let parsedFollowUpDate = undefined;
        if (followUpDate && followUpDate.trim() !== "") {
            // Must match YYYY-MM-DD format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(followUpDate.trim())) {
                return res.status(400).json({ success: false, error: "Follow-up date must be in YYYY-MM-DD format (e.g. 2026-04-15)." });
            }

            const parsed = new Date(followUpDate.trim());
            if (isNaN(parsed.getTime())) {
                return res.status(400).json({ success: false, error: "Follow-up date is not a valid date." });
            }

            // Must not be in the past (compare date only, not time)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            parsed.setHours(0, 0, 0, 0);
            if (parsed < today) {
                return res.status(400).json({ success: false, error: "Follow-up date cannot be in the past." });
            }

            parsedFollowUpDate = parsed;
        }

        const updateFields = { diagnosis, medicines, exerciseAdvice, generalComments };
        if (parsedFollowUpDate !== undefined) {
            updateFields.followUpDate = parsedFollowUpDate;
        } else {
            // If no date provided, clear any existing followUpDate
            updateFields.followUpDate = null;
        }

        const consultation = await Consultation.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true }
        );
        res.json({ success: true, consultation });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

import Review from "../models/Review.js";

// 🔹 Submit a Review (Patient only)
router.post("/reviews", async (req, res) => {
    try {
        const { patientId, doctorId, consultationId, rating, comment } = req.body;

        // Check if review already exists
        const existing = await Review.findOne({ consultationId });
        if (existing) {
            return res.status(400).json({ success: false, error: "You already reviewed this session." });
        }

        const review = new Review({
            patientId,
            doctorId,
            consultationId,
            rating,
            comment
        });

        await review.save();
        res.json({ success: true, message: "Review submitted successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Get Doctor Reviews
router.get("/doctor/:id/reviews", async (req, res) => {
    try {
        const reviews = await Review.find({ doctorId: req.params.id })
            .populate("patientId", "name")
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Get Patient History (For Doctor View)
router.get("/patient/:id/history", async (req, res) => {
    try {
        const patientId = req.params.id;
        // Select all patient fields EXCEPT email, phoneNumber (phone) and city (place)
        const patient = await User.findById(patientId)
            .select("-email -phoneNumber -city -password -googleId -picture -isBlocked -isVerified -otp -otpExpiry -profileCompleted -providerProfile -userType");

        if (!patient) return res.status(404).json({ success: false, error: "Patient not found" });

        const consultations = await Consultation.find({ patientId })
            .select("consultationDate timeSlot doctorName problemDescription diagnosis medicines exerciseAdvice generalComments followUpDate status")
            .sort({ consultationDate: -1 });

        res.json({ success: true, patient, consultations });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Get patient payment history
router.get("/patient/:id/payments", async (req, res) => {
    try {
        const patientId = req.params.id;
        console.log(`🔍 Fetching payments for patient: ${patientId}`);

        if (!patientId || patientId === 'undefined') {
            return res.status(400).json({ success: false, error: "Invalid Patient ID" });
        }

        // Get all consultations for this patient with payment info
        const consultations = await Consultation.find({ patientId })
            .select("doctorName totalFee paymentStatus createdAt consultationDate timeSlot")
            .sort({ createdAt: -1 });

        console.log(`✅ Found ${consultations.length} consultations for payment history.`);

        // Transform to payment format
        const payments = consultations.map(c => ({
            _id: c._id,
            type: 'consultation',
            amount: c.totalFee || 0,
            status: c.paymentStatus === 'paid' ? 'successful' : 'failed',
            doctorName: c.doctorName,
            createdAt: c.createdAt,
            transactionId: c._id.toString().substring(0, 12).toUpperCase()
        }));

        res.json({ success: true, payments });
    } catch (err) {
        console.error("❌ Error fetching patient payments:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔹 Get doctor payment history
router.get("/doctor/:id/payments", async (req, res) => {
    try {
        const doctorId = req.params.id;

        // Get all consultations for this doctor with payment info
        const consultations = await Consultation.find({ doctorId })
            .select("patientName doctorShare totalFee paymentStatus createdAt consultationDate timeSlot")
            .sort({ createdAt: -1 });

        // Transform to payment format
        const payments = consultations.map(c => ({
            _id: c._id,
            type: 'consultation',
            amount: c.doctorShare || c.totalFee || 0,
            status: c.paymentStatus === 'paid' ? 'successful' : 'failed',
            patientName: c.patientName,
            createdAt: c.createdAt,
            transactionId: c._id.toString().substring(0, 12).toUpperCase()
        }));

        res.json({ success: true, payments });
    } catch (err) {
        console.error("Error fetching doctor payments:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;