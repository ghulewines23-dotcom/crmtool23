import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IOtpToken extends Document {
  userId: string;
  email: string;
  otpHash: string;
  expiresAt: Date;
  used: boolean;
  attempts: number;
  createdAt: Date;
}

const OtpTokenSchema = new Schema<IOtpToken>({
  userId: { type: String, required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

OtpTokenSchema.index({ userId: 1, createdAt: -1 });
OtpTokenSchema.index({ email: 1, createdAt: -1 });

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export default mongoose.models.OtpToken ||
  mongoose.model<IOtpToken>("OtpToken", OtpTokenSchema);
