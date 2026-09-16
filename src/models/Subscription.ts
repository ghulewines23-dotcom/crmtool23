import mongoose, { Schema, Document } from "mongoose";

export type SubscriptionPlan = "FREE_TRIAL" | "STARTER" | "GROWTH" | "PRO";
export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PENDING"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED";

export interface ISubscription extends Document {
  organizationId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number; // in INR paise or rupees — stored as rupees
  maxLeads: number;
  maxMembers: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date | null;
  paymentProvider?: string;
  customerId?: string;
  subscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: { type: String, required: true, index: true, unique: true },
    plan: {
      type: String,
      enum: ["FREE_TRIAL", "STARTER", "GROWTH", "PRO"],
      required: true,
      default: "FREE_TRIAL",
    },
    status: {
      type: String,
      enum: ["TRIAL", "ACTIVE", "PENDING", "PAST_DUE", "CANCELLED", "EXPIRED"],
      default: "TRIAL",
    },
    price: { type: Number, default: 0 },
    maxLeads: { type: Number, default: 20 },
    maxMembers: { type: Number, default: 1 },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    trialEndsAt: { type: Date, default: null },
    paymentProvider: { type: String, default: "" },
    customerId: { type: String, default: "" },
    subscriptionId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
