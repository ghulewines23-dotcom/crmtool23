import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import TeamMember from "@/models/TeamMember";
import { requirePlatformOwner } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS, PLAN_LIMITS } from "@/lib/auth-helpers";
import type { SubscriptionPlan } from "@/models/Subscription";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/platform/organizations
 * List all customer organizations (SERENE_OWNER only).
 */
export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Organization.countDocuments(query);
    const orgs = await Organization.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Enrich with subscription and member count
    const enriched = await Promise.all(
      orgs.map(async (org) => {
        const orgId = String(org._id);
        const [sub, memberCount] = await Promise.all([
          Subscription.findOne({ organizationId: orgId })
            .select("plan status maxLeads maxMembers trialEndsAt currentPeriodEnd")
            .lean(),
          TeamMember.countDocuments({ organizationId: orgId, status: "active" }),
        ]);
        return {
          id: orgId,
          name: org.name,
          status: org.status,
          industry: org.industry,
          founderId: org.founderId,
          createdAt: org.createdAt,
          subscription: sub || null,
          memberCount,
        };
      })
    );

    return Response.json({
      success: true,
      organizations: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Platform org list error:", error);
    return jsonError("Failed to fetch organizations", 500);
  }
}

/**
 * POST /api/platform/organizations
 * Create a customer organization (SERENE_OWNER only, for manual provisioning).
 */
export async function POST(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const body = await request.json();

    if (!body.name || !body.founderId) {
      return jsonError("name and founderId are required", 400);
    }

    // Verify founder exists
    const founder = await TeamMember.findById(body.founderId).lean();
    if (!founder) {
      return jsonError("Founder user not found", 404);
    }

    const org = await Organization.create({
      name: body.name,
      founderId: body.founderId,
      industry: body.industry || "",
      phone: body.phone || "",
      status: "ACTIVE",
    });

    const orgId = String(org._id);

    const plan: SubscriptionPlan = body.plan || "FREE_TRIAL";
    const limits = PLAN_LIMITS[plan];

    await Subscription.create({
      organizationId: orgId,
      plan,
      status: plan === "FREE_TRIAL" ? "TRIAL" : "ACTIVE",
      price: limits.price,
      maxLeads: limits.maxLeads,
      maxMembers: limits.maxMembers,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + limits.durationDays * 24 * 60 * 60 * 1000),
      trialEndsAt: plan === "FREE_TRIAL"
        ? new Date(Date.now() + limits.durationDays * 24 * 60 * 60 * 1000)
        : null,
    });

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      organizationId: orgId,
      action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
      targetType: "Organization",
      targetId: orgId,
      metadata: { createdByPlatformOwner: true },
    });

    return Response.json({ success: true, organizationId: orgId }, { status: 201 });
  } catch (error) {
    console.error("Platform org create error:", error);
    return jsonError("Failed to create organization", 500);
  }
}
