import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  description: string;
  client: string;
  project: string;
  status: "todo" | "in_progress" | "review" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  startDate: string;
  dueDate: string;
  assignedTo: string;
  assignedToName: string;
  organizationId: string;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  reminderSentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    client: { type: String, trim: true, default: "" },
    project: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    startDate: { type: String, default: "" },
    dueDate: { type: String, default: "" },
    assignedTo: { type: String, default: "" },
    assignedToName: { type: String, default: "" },
    organizationId: { type: String, required: true, index: true },
    createdBy: { type: String, default: "" },
    createdByName: { type: String, default: "" },
    createdByRole: { type: String, default: "" },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TaskSchema.index({ status: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ organizationId: 1 });
TaskSchema.index({ createdAt: -1 });

export default mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
