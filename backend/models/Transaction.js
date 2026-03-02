// backend/models/Transaction.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  referenceId: {
    type: String,
    required: true,
    index: true
  },
  referenceType: {
    type: String,
    enum: ["booking", "listing_fee", "booking_split"],
    required: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentMethodDetails: {
    type: Object,
    default: {}
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending"
  },
  transactionId: {
    type: String,
    default: ""
  },
  notes: {
    type: String,
    default: ""
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;