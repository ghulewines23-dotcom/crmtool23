import mongoose, { Schema, Document } from "mongoose";

export type OrgStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "EXPIRED";

export interface IOrganization extends Document {
  name: string;
  founderId: string; // references TeamMember _id
  industry: string;
  website?: string;
  phone: string;
  country: string;
  logo?: string;
  status: OrgStatus;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    founderId: { type: String, required: true, index: true },
    industry: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    logo: { type: String, default: "" },
    status: {
      type: String,
      enum: ["ACTIVE", "TRIAL", "SUSPENDED", "EXPIRED"],
      default: "TRIAL",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
