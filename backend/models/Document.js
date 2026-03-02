import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    fileUrl: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        enum: ["image", "pdf", "other"],
        default: "other",
    },
    documentType: {
        type: String,
        enum: ["lab_report", "prescription", "xray", "scan", "other"],
        default: "other",
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    notes: {
        type: String,
        default: "",
    },
}, { timestamps: true });

const Document = mongoose.model("Document", documentSchema);
export default Document;