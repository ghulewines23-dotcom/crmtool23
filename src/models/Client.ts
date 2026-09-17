import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentRecord {
  id: string;
  amount: number;
  date: string;
  mode: string;
  note?: string;
}

export interface IClient extends Document {
  name: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  loginUrl: string;
  loginEmail: string;
  password: string;
  accessNotes: string;
  service: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  expenses: number;
  commission: number;
  paymentStatus: "pending" | "partial" | "paid" | "overdue";
  dueDate: string;
  notes: string;
  paymentHistory: IPaymentRecord[];
  avatar: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    mode: { type: String, required: true },
    note: { type: String },
  },
  { _id: false }
);

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    loginUrl: { type: String, trim: true, default: "" },
    loginEmail: { type: String, trim: true, default: "" },
    password: { type: String, default: "" },
    accessNotes: { type: String, trim: true, default: "" },
    service: { type: String, trim: true, default: "" },
    totalAmount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue"],
      default: "pending",
    },
    dueDate: { type: String, default: "" },
    notes: { type: String, default: "" },
    paymentHistory: [PaymentRecordSchema],
    avatar: { type: String, default: "" },
    organizationId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Client ||
  mongoose.model<IClient>("Client", ClientSchema);
