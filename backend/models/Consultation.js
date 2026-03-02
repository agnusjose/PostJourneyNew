import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    timeSlot: { type: String, required: true },
    patientName: { type: String, required: true },
    doctorName: { type: String, required: true },
    consultationDate: { type: Date, required: true },
    status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
    problemDescription: { type: String },
    paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
    amount: { type: Number },
    totalFee: { type: Number, default: 0 },
    adminCommission: { type: Number, default: 0 },
    doctorShare: { type: Number, default: 0 },
    diagnosis: { type: String },
    medicines: { type: String },
    exerciseAdvice: { type: String },
    generalComments: { type: String },
    followUpDate: { type: Date },
    isReviewed: { type: Boolean, default: false },

    // Chat session tracking
    chatStarted: { type: Boolean, default: false },
    patientRequestedJoin: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Consultation", consultationSchema);