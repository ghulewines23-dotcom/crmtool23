import mongoose, { Schema, Document } from "mongoose";

export type JoinRequestStatus = "pending" | "approved" | "rejected";

export interface IJoinRequest extends Document {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  status: JoinRequestStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema = new Schema<IJoinRequest>(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    organizationId: { type: String, required: true, index: true },
    organizationName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

JoinRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.JoinRequest ||
  mongoose.model<IJoinRequest>("JoinRequest", JoinRequestSchema);
