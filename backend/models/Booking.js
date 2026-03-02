import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  equipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Equipment",
    required: true
  },
  equipmentName: {
    type: String,
    required: true
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
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  pricePerDay: {
    type: Number,
    required: true
  },
  quantity: { // ADD THIS FIELD
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "in-progress", "completed", "cancelled"],
    default: "pending"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "refunded"],
    default: "pending"
  },
  paymentMethod: {
    type: String,
    enum: ["pending", "upi", "card", "netbanking", "wallet", "cod"],
    default: "pending"
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ""
  },
  cancelledBy: {
    type: String,
    enum: ["patient", "provider", "system", ""],
    default: ""
  },
  cancellationReason: {
    type: String,
    default: ""
  },
  hasReview: {
    type: Boolean,
    default: false
  },
  // Review data - stored directly on booking
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      default: ""
    },
    reviewDate: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Update the pre-save middleware to calculate total amount with quantity
bookingSchema.pre("save", function (next) {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const timeDiff = Math.abs(end - start);
  this.totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  this.totalAmount = this.totalDays * this.pricePerDay * this.quantity; // Multiply by quantity
  next();
});

// Make sure this line is exactly like this:
const Booking = mongoose.model("Booking", bookingSchema);
export default Booking; // This line is crucial