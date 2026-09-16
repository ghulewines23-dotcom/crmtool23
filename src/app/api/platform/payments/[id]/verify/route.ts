import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Payment from "@/models/Payment";
import { requirePlatformOwner } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body; // action: "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      return jsonError("Invalid action. Must be 'approve' or 'reject'.", 400);
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return jsonError("Payment record not found", 404);
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    payment.status = newStatus;
    payment.verifiedAt = new Date();
    payment.verifiedBy = auth.user.id;
    if (notes) payment.notes = notes;
    await payment.save();

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      organizationId: payment.organizationId || null,
      action: action === "approve" ? AUDIT_ACTIONS.PAYMENT_APPROVED : AUDIT_ACTIONS.PAYMENT_REJECTED,
      targetType: "Payment",
      targetId: String(payment._id),
      metadata: { plan: payment.plan, amount: payment.amount, status: newStatus },
    });

    return Response.json({ success: true, payment });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return jsonError("Failed to verify payment", 500);
  }
}
