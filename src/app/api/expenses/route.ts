import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Expense from "@/models/Expense";
import { requireRole } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, "FOUNDER", "ADMIN", "SERENE_OWNER");
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const expenses = await Expense.find({ organizationId: auth.user.organizationId })
      .sort({ date: -1 })
      .lean();

    return Response.json({
      success: true,
      expenses: expenses.map((e) => ({ ...e, id: String(e._id) })),
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return jsonError("Failed to fetch expenses", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, "FOUNDER", "ADMIN", "SERENE_OWNER");
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const { title, category, amount, date, notes } = body;

    if (!title || !amount || isNaN(Number(amount))) {
      return jsonError("Title and valid amount are required", 400);
    }

    const newExpense = await Expense.create({
      organizationId: auth.user.organizationId,
      title: title.trim(),
      category: category || "MISC",
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      notes: (notes || "").trim(),
      createdBy: auth.user.id,
    });

    return Response.json({
      success: true,
      expense: { ...newExpense.toObject(), id: String(newExpense._id) },
      message: "Expense added successfully",
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    return jsonError("Failed to create expense", 500);
  }
}
