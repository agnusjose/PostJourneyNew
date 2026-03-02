// backend/models/PaymentMethod.js (optional but recommended)
import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  methodType: {
    type: String,
    enum: ["upi", "card", "netbanking", "wallet", "cod"],
    required: true
  },
  methodName: {
    type: String,
    required: true
  },
  details: {
    type: Object,
    default: {}
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const PaymentMethod = mongoose.model("PaymentMethod", paymentMethodSchema);
export default PaymentMethod;