import mongoose, { Schema, Document } from "mongoose";

export type NotificationType = "invitation_accepted" | "invitation_declined" | "org_joined" | "member_joined" | "general";

export interface INotification extends Document {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  organizationId?: string | null;
  invitationId?: string | null;
  read: boolean;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["invitation_accepted", "invitation_declined", "org_joined", "member_joined", "general"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    organizationId: { type: String, default: null },
    invitationId: { type: String, default: null },
    read: { type: Boolean, default: false },
    actionUrl: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
