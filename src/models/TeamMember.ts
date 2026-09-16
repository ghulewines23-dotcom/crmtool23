import mongoose, { Schema, Document } from "mongoose";

/**
 * Role hierarchy:
 * SERENE_OWNER — Global Serene CRM owner (not a customer)
 * FOUNDER        — Customer org owner, full control of their org
 * ADMIN          — Customer org member, read-only org data by default
 * SALES_PERSON   — Customer org member, access only to assigned leads
 */
export type UserRole = "SERENE_OWNER" | "FOUNDER" | "ADMIN" | "SALES_PERSON";

export interface IOrgMembership {
  organizationId: string;
  role: UserRole;
  joinedAt: Date;
}

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
  status: "active" | "inactive" | "invited" | "pending_access" | "suspended";
  organizationId: string;
  organizations: IOrgMembership[];
  passwordHash: string;
  activeSessionId: string;
  canAccessCRM: boolean;
  canCreateOrganization: boolean;
  canJoinOrganization: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrgMembershipSchema = new Schema<IOrgMembership>(
  {
    organizationId: { type: String, required: true },
    role: {
      type: String,
      enum: ["SERENE_OWNER", "FOUNDER", "ADMIN", "SALES_PERSON"],
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

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
      enum: ["active", "inactive", "invited", "pending_access", "suspended"],
      default: "active",
    },
    // Active organization (backward compat — always the currently selected org)
    organizationId: { type: String, default: "", index: true },
    // All organization memberships
    organizations: { type: [OrgMembershipSchema], default: [] },
    passwordHash: { type: String, default: "" },
    activeSessionId: { type: String, default: "" },
    canAccessCRM: { type: Boolean, default: false },
    canCreateOrganization: { type: Boolean, default: false },
    canJoinOrganization: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Global email uniqueness (email is the login identifier across all orgs)
TeamMemberSchema.index({ email: 1 }, { unique: true });
TeamMemberSchema.index({ organizationId: 1, role: 1 });
TeamMemberSchema.index({ "organizations.organizationId": 1 });

export default mongoose.models.TeamMember ||
  mongoose.model<ITeamMember>("TeamMember", TeamMemberSchema);
