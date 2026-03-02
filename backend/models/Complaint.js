import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        userName: { type: String, required: true },
        userType: { type: String, enum: ["patient", "doctor", "service-provider"], required: true },
        subject: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        status: {
            type: String,
            enum: ["pending", "reviewed", "resolved", "dismissed"],
            default: "pending",
        },
        adminReply: { type: String, default: "" },
        repliedAt: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.model("Complaint", complaintSchema);
