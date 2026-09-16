import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IPasswordResetToken extends Document {
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>({
  userId: { type: String, required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: true });

PasswordResetTokenSchema.index({ userId: 1, createdAt: -1 });
PasswordResetTokenSchema.index({ tokenHash: 1 });

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>("PasswordResetToken", PasswordResetTokenSchema);
