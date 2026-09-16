import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export type JoinTokenStatus = "active" | "used" | "revoked";
export type JoinRole = "ADMIN" | "SALES_PERSON";

export interface IJoinToken extends Document {
  tokenHash: string; // SHA-256 hash of the raw token
  organizationId: string;
  role: JoinRole;
  createdBy: string; // TeamMember _id of FOUNDER
  recipientEmail: string; // email of the invited person
  expiresAt: Date;
  usedAt?: Date | null;
  usedBy?: string | null; // TeamMember _id who used it
  revokedAt?: Date | null;
  status: JoinTokenStatus;
  createdAt: Date;
  updatedAt: Date;
}

const JoinTokenSchema = new Schema<IJoinToken>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    organizationId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["ADMIN", "SALES_PERSON"],
      required: true,
    },
    createdBy: { type: String, required: true },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    usedBy: { type: String, default: null },
    revokedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "used", "revoked"],
      default: "active",
    },
  },
  { timestamps: true }
);

/** Hash a raw token string for storage */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Generate a cryptographically secure random token */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export default mongoose.models.JoinToken ||
  mongoose.model<IJoinToken>("JoinToken", JoinTokenSchema);
