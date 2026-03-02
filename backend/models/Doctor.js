import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    specialization: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {                 // ✅ renamed from phoneNumber
        type: String,
        required: true,
    },
    fee: {                   // ✅ renamed from consultationFee
        type: Number,
        required: true,
    },
    image: {                 // ✅ optional for future use
        type: String,
        default: "",
    },
}, { timestamps: true });

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;