import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  actorId: string; // TeamMember _id
  actorEmail: string;
  organizationId?: string | null; // null for SERENE_OWNER global actions
  action: string; // e.g. "USER_SIGNUP", "MEMBER_JOINED", "ROLE_CHANGED"
  targetType?: string | null; // e.g. "User", "Organization", "Subscription"
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true, index: true },
    actorEmail: { type: String, required: true },
    organizationId: { type: String, default: null, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
