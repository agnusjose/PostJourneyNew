import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    default: ""
  },
  date: {
    type: Date,
    default: Date.now
  }



});

const equipmentSchema = new mongoose.Schema({
  equipmentName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  pricePerDay: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  imageUrl: {
    type: String,
    default: ""
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  providerName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: [
      "mobility",
      "respiratory",
      "daily-living",
      "therapeutic",
      "monitoring",
      "beds",
      "other"
    ],
    default: "other"
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  reviews: [reviewSchema],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  listingFeePaid: {
    type: Boolean,
    default: false
  },
  listingFeeAmount: {
    type: Number,
    default: 0
  },
  isListed: {
    type: Boolean,
    default: false
  },
  adminApproved: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true
});

// Calculate average rating before saving
equipmentSchema.pre("save", function (next) {
  if (this.reviews.length > 0) {
    const sum = this.reviews.reduce((total, review) => total + review.rating, 0);
    this.averageRating = sum / this.reviews.length;
    this.totalReviews = this.reviews.length;
  } else {
    this.averageRating = 0;
    this.totalReviews = 0;
  }
  next();
});

// ✅ FIX: Add middleware to auto-update isAvailable based on stock
// In Equipment.js - Update the middleware
equipmentSchema.pre("save", function (next) {
  // Always update isAvailable based on stock
  if (this.stock > 0) {
    this.isAvailable = true;
  } else {
    this.isAvailable = false;
  }
  next();
});

// ✅ FIX: Only ONE model export - remove any duplicate!
const Equipment = mongoose.model("Equipment", equipmentSchema);
export default Equipment;