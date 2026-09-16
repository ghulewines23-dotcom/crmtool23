import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Subscription from "@/models/Subscription";
import { requireAuth } from "@/lib/api-auth";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/organization/subscription
 * Returns the subscription for the authenticated user's organization.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!auth.user.organizationId) {
    return jsonError("No organization associated with this account", 404);
  }

  try {
    await connectDB();

    const sub = await Subscription.findOne({
      organizationId: auth.user.organizationId,
    }).lean();

    if (!sub) {
      return jsonError("Subscription not found", 404);
    }

    return Response.json({
      success: true,
      subscription: {
        id: String((sub as { _id: unknown })._id),
        organizationId: (sub as { organizationId: string }).organizationId,
        plan: (sub as { plan: string }).plan,
        status: (sub as { status: string }).status,
        price: (sub as { price: number }).price,
        maxLeads: (sub as { maxLeads: number }).maxLeads,
        maxMembers: (sub as { maxMembers: number }).maxMembers,
        trialEndsAt: (sub as { trialEndsAt: Date | null }).trialEndsAt,
        currentPeriodStart: (sub as { currentPeriodStart: Date }).currentPeriodStart,
        currentPeriodEnd: (sub as { currentPeriodEnd: Date }).currentPeriodEnd,
        createdAt: (sub as { createdAt: Date }).createdAt,
      },
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return jsonError("Failed to fetch subscription", 500);
  }
}
