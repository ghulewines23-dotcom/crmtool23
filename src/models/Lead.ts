import mongoose, { Schema, Document } from "mongoose";

export interface ILead extends Document {
  name: string;
  phone: string;
  email: string;
  company: string;
  source: string;
  sourceUrl: string;
  status: "new" | "not_connected" | "processing" | "follow_up" | "hot_lead" | "won" | "lost" | "overdue";
  requirement: string;
  notes: string;
  interestedIn: string;
  website: string;
  location: string;
  value: number;
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo: string;
  assignedToName: string;
  nextFollowup: Date | null;
  lastActivity: Date;
  organizationId: string;
  createdBy: string;
  rawExcelData?: Record<string, any>;
  aiTemperature: "cold" | "warm" | "hot" | null;
  aiIntent: string | null;
  aiPriority: number | null;
  aiSummary: string | null;
  aiNextAction: string | null;
  aiConfidence: number | null;
  aiAnalyzedAt: Date | null;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, trim: true, default: "" },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: "" },
    company: { type: String, required: true, trim: true, default: "" },
    source: { type: String, trim: true, default: "" },
    sourceUrl: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["new", "not_connected", "processing", "follow_up", "hot_lead", "won", "lost", "overdue"],
      default: "new",
    },
    requirement: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: "" },
    interestedIn: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    value: { type: Number, default: 0 },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    assignedTo: { type: String, default: "" },
    assignedToName: { type: String, default: "" },
    nextFollowup: { type: Date, default: null },
    lastActivity: { type: Date, default: Date.now },
    organizationId: { type: String, required: true, index: true },
    createdBy: { type: String, default: "" },
    rawExcelData: { type: Schema.Types.Mixed, default: {} },
    // AI analysis fields
    aiTemperature: { type: String, enum: ["cold", "warm", "hot", null], default: null },
    aiIntent: { type: String, default: null },
    aiPriority: { type: Number, default: null },
    aiSummary: { type: String, default: null },
    aiNextAction: { type: String, default: null },
    aiConfidence: { type: Number, default: null },
    aiAnalyzedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

LeadSchema.index({ phone: 1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ assignedTo: 1 });
LeadSchema.index({ createdBy: 1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ company: 1 });
LeadSchema.index({ requirement: 1 });
LeadSchema.index({ name: "text", phone: "text", company: "text", email: "text", requirement: "text" });

export default mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
