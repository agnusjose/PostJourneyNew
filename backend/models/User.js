import mongoose from "mongoose";

// ========== PATIENT PROFILE SUB-SCHEMA ==========
const patientProfileSchema = new mongoose.Schema({
  age: { type: Number, default: null },
  gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
  address: { type: String, default: "" },
  primaryCondition: { type: String, default: "" },
  height: { type: Number, default: null },
  weight: { type: Number, default: null },
  bloodGroup: { type: String, default: "" },
  medicalHistory: { type: String, default: "" },
  emergencyContact: { type: String, default: "" },
  activityLevel: {
    type: String,
    enum: ["sedentary", "lightly_active", "moderately_active", "very_active", ""],
    default: ""
  },
  primaryGoal: {
    type: String,
    enum: ["pain_relief", "mobility", "strength", "recovery", "wellness", ""],
    default: ""
  },
  surgeryHistory: { type: String, default: "" },
  currentMedications: { type: String, default: "" },
  smokingHabit: { type: Boolean, default: false },
  alcoholConsumption: {
    type: String,
    enum: ["never", "occasional", "regular", ""],
    default: ""
  },
  sleepHours: { type: Number, default: null }
}, { _id: false });

// ========== PROVIDER VERIFICATION SUB-SCHEMA ==========
const providerVerificationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", ""],
    default: ""
  },
  documentUrl: { type: String, default: "" },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date },
  rejectionReason: { type: String, default: "" }
}, { _id: false });

// ========== PROVIDER PROFILE SUB-SCHEMA ==========
// Used ONLY by service-provider users (NOT doctor, NOT patient)
// serviceType = "equipment" → Equipment Provider → ServiceProviderDashboard
// serviceType = "caregiver" → Caregiver Provider → CaregiverDashboard
const providerProfileSchema = new mongoose.Schema({
  agencyName: { type: String, default: "" },
  serviceType: { type: String, enum: ["equipment", "caregiver", ""], default: "" },
  caregivingServices: { type: String, default: "" }, // e.g. "Elderly Care, Post-Surgery Care"
  patientTypes: { type: String, default: "" },       // e.g. "Elderly, Post-surgical, Disabled"
  serviceLocations: { type: String, default: "" },   // e.g. "Chennai, Bangalore, Coimbatore"
  aboutUs: { type: String, default: "" },
  operatingHours: { type: String, default: "" },
  fullAddress: { type: String, default: "" },
  website: { type: String, default: "" },
  licenseNumber: { type: String, default: "" },
  caregiverReviews: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      userName: String,
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, default: "" },
      date: { type: Date, default: Date.now },
    }
  ],
  verification: { type: providerVerificationSchema, default: () => ({}) }
}, { _id: false, strict: true }); // strict: true prevents doctor fields leaking in

// ========== MAIN USER SCHEMA ==========
const userSchema = new mongoose.Schema(
  {
    // ── COMMON FIELDS (All Users) ──────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false }, // Optional for Google auth

    googleId: { type: String, default: null },
    picture: { type: String, default: null },

    // Determines which dashboard and features this user gets:
    //   "patient"          → PatientDashboard
    //   "doctor"           → DoctorDashboard (single fixed account, seeded via create_doctor.js)
    //   "service-provider" → ServiceProviderDashboard (equipment) OR CaregiverDashboard (caregiver)
    //                        Sub-type determined by providerProfile.serviceType after profile completion
    userType: {
      type: String,
      enum: ["patient", "doctor", "service-provider", "admin", "service provider", "provider"],
      required: true
    },

    // Shared fields (all user types)
    phoneNumber: { type: String, default: "" },
    city: { type: String, default: "" },
    isBlocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },

    // ── DOCTOR-SPECIFIC FIELDS ────────────────────────────────────────────
    // Used ONLY when userType === "doctor"
    // No default values → these fields will NOT appear on patient or
    // service-provider documents in MongoDB (only set on the doctor account)
    specialization: { type: String },
    experience: { type: String },
    consultationFee: { type: Number },
    doctorImage: { type: String },
    about: { type: String },
    qualification: { type: String },
    languages: { type: String },
    isOnline: { type: Boolean },

    // ── OTP / AUTH FIELDS ────────────────────────────────────────────────
    otp: String,
    otpExpiry: Date,
    otpLastSentAt: Date,
    resetPasswordOtp: String,
    resetPasswordOtpExpiry: Date,

    // ── ROLE-SPECIFIC PROFILE SUB-DOCUMENTS ──────────────────────────────
    // default: undefined means these only appear when explicitly set

    // Filled during PatientProfileCompletion (only for patients)
    patientProfile: { type: patientProfileSchema, default: undefined },

    // Filled during ServiceProviderProfileCompletion (only for service-providers)
    // Contains serviceType ("equipment" or "caregiver") + verification status
    providerProfile: { type: providerProfileSchema, default: undefined },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);