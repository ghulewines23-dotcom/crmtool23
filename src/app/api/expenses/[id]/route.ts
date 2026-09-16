import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Expense from "@/models/Expense";
import { requireRole } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, "FOUNDER", "ADMIN", "SERENE_OWNER");
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;

    const deleted = await Expense.findOneAndDelete({
      _id: id,
      organizationId: auth.user.organizationId,
    });

    if (!deleted) {
      return jsonError("Expense not found", 404);
    }

    return Response.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return jsonError("Failed to delete expense", 500);
  }
}
