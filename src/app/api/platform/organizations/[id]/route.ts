import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import { requirePlatformOwner } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS, PLAN_LIMITS } from "@/lib/auth-helpers";
import type { SubscriptionPlan } from "@/models/Subscription";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/platform/organizations/[id]
 * Get a single organization with full details (SERENE_OWNER only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;

    const [org, sub] = await Promise.all([
      Organization.findById(id).lean(),
      Subscription.findOne({ organizationId: id }).lean(),
    ]);

    if (!org) return jsonError("Organization not found", 404);

    return Response.json({
      success: true,
      organization: org,
      subscription: sub,
    });
  } catch (error) {
    console.error("Platform org get error:", error);
    return jsonError("Failed to fetch organization", 500);
  }
}

/**
 * PUT /api/platform/organizations/[id]
 * Activate/suspend an org, change plan, change subscription status (SERENE_OWNER only).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const org = await Organization.findById(id).lean();
    if (!org) return jsonError("Organization not found", 404);

    // ── Update org status ──
    if (body.status) {
      const validStatuses = ["ACTIVE", "TRIAL", "SUSPENDED", "EXPIRED"];
      if (!validStatuses.includes(body.status)) {
        return jsonError(`Invalid status: ${body.status}`, 400);
      }

      await Organization.findByIdAndUpdate(id, { status: body.status });

      const action =
        body.status === "SUSPENDED"
          ? AUDIT_ACTIONS.ORG_SUSPENDED
          : body.status === "ACTIVE"
          ? AUDIT_ACTIONS.ORG_ACTIVATED
          : AUDIT_ACTIONS.SUBSCRIPTION_CHANGED;

      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        organizationId: id,
        action,
        targetType: "Organization",
        targetId: id,
        metadata: { newStatus: body.status, previousStatus: (org as { status: string }).status },
      });
    }

    // ── Update subscription plan ──
    if (body.plan) {
      const validPlans: SubscriptionPlan[] = ["FREE_TRIAL", "STARTER", "GROWTH", "PRO"];
      if (!validPlans.includes(body.plan)) {
        return jsonError(`Invalid plan: ${body.plan}`, 400);
      }

      const limits = PLAN_LIMITS[body.plan as SubscriptionPlan];
      const now = new Date();

      await Subscription.findOneAndUpdate(
        { organizationId: id },
        {
          plan: body.plan,
          status: body.subscriptionStatus || (body.plan === "FREE_TRIAL" ? "TRIAL" : "ACTIVE"),
          price: limits.price,
          maxLeads: limits.maxLeads,
          maxMembers: limits.maxMembers,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + limits.durationDays * 24 * 60 * 60 * 1000),
          trialEndsAt: body.plan === "FREE_TRIAL"
            ? new Date(now.getTime() + limits.durationDays * 24 * 60 * 60 * 1000)
            : null,
        },
        { upsert: true, new: true }
      );

      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        organizationId: id,
        action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGED,
        targetType: "Subscription",
        targetId: id,
        metadata: { newPlan: body.plan },
      });
    }

    // ── Update subscription status only ──
    if (body.subscriptionStatus && !body.plan) {
      const validSubStatuses = ["TRIAL", "ACTIVE", "PENDING", "PAST_DUE", "CANCELLED", "EXPIRED"];
      if (!validSubStatuses.includes(body.subscriptionStatus)) {
        return jsonError(`Invalid subscription status: ${body.subscriptionStatus}`, 400);
      }

      await Subscription.findOneAndUpdate(
        { organizationId: id },
        { status: body.subscriptionStatus }
      );

      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        organizationId: id,
        action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGED,
        targetType: "Subscription",
        targetId: id,
        metadata: { newSubscriptionStatus: body.subscriptionStatus },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Platform org update error:", error);
    return jsonError("Failed to update organization", 500);
  }
}
