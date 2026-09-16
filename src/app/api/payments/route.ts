import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Payment from "@/models/Payment";
import { requireAuth } from "@/lib/api-auth";
import { PLAN_LIMITS } from "@/lib/auth-helpers";
import type { SubscriptionPlan } from "@/models/Subscription";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const payments = await Payment.find({
      $or: [
        { userId: auth.user.id },
        ...(auth.user.organizationId ? [{ organizationId: auth.user.organizationId }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ success: true, payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return jsonError("Failed to fetch payments", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const plan = (body.plan as SubscriptionPlan) || "STARTER";

    if (!["STARTER", "GROWTH", "PRO"].includes(plan)) {
      return jsonError("Invalid plan selected for paid subscription", 400);
    }

    // Always compute price server-side from PLAN_LIMITS (never trust frontend price!)
    const planConfig = PLAN_LIMITS[plan];
    const amount = planConfig.price;

    const payment = await Payment.create({
      userId: auth.user.id,
      organizationId: auth.user.organizationId || null,
      plan,
      amount,
      currency: "INR",
      paymentProvider: "Razorpay",
      paymentLinkId: `plink_${Date.now()}`,
      paymentId: `pay_${Date.now()}`,
      status: "PENDING",
      submittedAt: new Date(),
      notes: body.notes || `${plan} plan payment request via Razorpay Payment Link`,
    });

    return Response.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    console.error("Error submitting payment:", error);
    return jsonError("Failed to submit payment", 500);
  }
}
