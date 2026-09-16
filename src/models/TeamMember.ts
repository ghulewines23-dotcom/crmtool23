import mongoose, { Schema, Document } from "mongoose";

/**
 * Role hierarchy:
 * SERENE_OWNER — Global Serene CRM owner (not a customer)
 * FOUNDER        — Customer org owner, full control of their org
 * ADMIN          — Customer org member, read-only org data by default
 * SALES_PERSON   — Customer org member, access only to assigned leads
 */
export type UserRole = "SERENE_OWNER" | "FOUNDER" | "ADMIN" | "SALES_PERSON";

export interface ITeamMember extends Document {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  activeLeads: number;
  activeTasks: number;
  completedTasks: number;
  projects: number;
  status: "active" | "inactive" | "invited";
  organizationId: string; // empty string for SERENE_OWNER
  passwordHash: string;
  activeSessionId: string; // the one valid session ID for this user
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    phone: { type: String, trim: true, default: "" },
    role: {
      type: String,
      enum: ["SERENE_OWNER", "FOUNDER", "ADMIN", "SALES_PERSON"],
      required: true,
      default: "SALES_PERSON",
    },
    avatar: { type: String, default: "" },
    activeLeads: { type: Number, default: 0 },
    activeTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive", "invited"],
      default: "active",
    },
    // Empty string for SERENE_OWNER (they belong to no customer org)
    organizationId: { type: String, default: "", index: true },
    passwordHash: { type: String, default: "" },
    // Single active device: the one valid session ID for this user
    activeSessionId: { type: String, default: "" },
  },
  { timestamps: true }
);

// Global email uniqueness (email is the login identifier across all orgs)
TeamMemberSchema.index({ email: 1 }, { unique: true });
TeamMemberSchema.index({ organizationId: 1, role: 1 });

export default mongoose.models.TeamMember ||
  mongoose.model<ITeamMember>("TeamMember", TeamMemberSchema);
