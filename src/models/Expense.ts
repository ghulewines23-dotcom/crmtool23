import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpense extends Document {
  organizationId: string;
  title: string;
  category: "SALARY" | "MARKETING" | "SOFTWARE" | "OFFICE" | "MISC";
  amount: number;
  date: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema<IExpense> = new Schema(
  {
    organizationId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["SALARY", "MARKETING", "SOFTWARE", "OFFICE", "MISC"],
      default: "MISC",
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
