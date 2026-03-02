import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['doctor', 'patient'], required: true },
    content: { type: String },
    messageType: { type: String, enum: ['text', 'image', 'audio'], default: 'text' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Message", messageSchema);