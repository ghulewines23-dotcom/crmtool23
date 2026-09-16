import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";

export interface IPayment extends Document {
  userId: string;
  organizationId?: string | null;
  plan: "FREE_TRIAL" | "STARTER" | "GROWTH" | "PRO";
  amount: number;
  currency: string;
  paymentProvider: string;
  paymentLinkId?: string;
  paymentId?: string;
  status: PaymentStatus;
  submittedAt: Date;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema<IPayment> = new Schema(
  {
    userId: { type: String, required: true, index: true },
    organizationId: { type: String, default: null, index: true },
    plan: {
      type: String,
      enum: ["FREE_TRIAL", "STARTER", "GROWTH", "PRO"],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentProvider: { type: String, default: "Razorpay" },
    paymentLinkId: { type: String, default: "" },
    paymentId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: String, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
