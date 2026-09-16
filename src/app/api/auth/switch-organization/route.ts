import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import { requireAuth } from "@/lib/api-auth";
import { createSessionToken, setSessionCookie, getSessionFromRequest, type SessionRole } from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * POST /api/auth/switch-organization
 * Switch the active organization for the authenticated user.
 *
 * Body: { organizationId: string }
 *
 * Server-side validation:
 * 1. Verify the user is a member of the target organization
 * 2. Update the active organizationId
 * 3. Issue a new JWT with the new org context
 * 4. Return the new org + subscription data
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (auth.user.role === "SERENE_OWNER") {
    return jsonError("Serene Owners cannot switch organizations", 403);
  }

  try {
    const body = await request.json();
    const targetOrgId = (body.organizationId || "").trim();

    if (!targetOrgId) {
      return jsonError("organizationId is required", 400);
    }

    await connectDB();

    // Fetch the user with their memberships
    const user = await TeamMember.findById(auth.user.id)
      .select("organizations organizationId email name role")
      .lean();

    if (!user) {
      return jsonError("User not found", 404);
    }

    // Lazy-initialize organizations array from legacy organizationId
    let memberships = (user as { organizations?: Array<{ organizationId: string; role: string; joinedAt: Date }> }).organizations || [];
    if (memberships.length === 0 && (user as { organizationId: string }).organizationId) {
      const legacyOrgId = (user as { organizationId: string }).organizationId;
      memberships = [{ organizationId: legacyOrgId, role: (user as { role: string }).role, joinedAt: new Date() }];
      await TeamMember.findByIdAndUpdate(auth.user.id, {
        organizations: memberships,
      });
    }

    // Server-side membership verification — never trust frontend
    const membership = memberships.find((m) => m.organizationId === targetOrgId);
    if (!membership) {
      return jsonError("You are not a member of this organization", 403);
    }

    // Verify the organization exists and is active
    const org = await Organization.findById(targetOrgId)
      .select("name status industry phone country logo founderId")
      .lean();

    if (!org) {
      return jsonError("Organization not found", 404);
    }

    if ((org as { status: string }).status === "SUSPENDED") {
      return jsonError("This organization is currently suspended", 403);
    }

    // Already on this org — no-op
    if ((user as { organizationId: string }).organizationId === targetOrgId) {
      // Still return the org data
      const sub = await Subscription.findOne({ organizationId: targetOrgId })
        .select("plan status maxLeads maxMembers trialEndsAt currentPeriodEnd price")
        .lean();

      return Response.json({
        success: true,
        organization: {
          id: String((org as { _id: unknown })._id),
          name: (org as { name: string }).name,
          status: (org as { status: string }).status,
          industry: (org as { industry: string }).industry,
          phone: (org as { phone: string }).phone,
          country: (org as { country: string }).country,
          logo: (org as { logo?: string }).logo || "",
          founderId: (org as { founderId: string }).founderId,
        },
        subscription: sub
          ? {
              plan: (sub as { plan: string }).plan,
              status: (sub as { status: string }).status,
              price: (sub as { price: number }).price,
              maxLeads: (sub as { maxLeads: number }).maxLeads,
              maxMembers: (sub as { maxMembers: number }).maxMembers,
              trialEndsAt: (sub as { trialEndsAt: Date | null }).trialEndsAt,
              currentPeriodStart: (sub as { currentPeriodStart: Date }).currentPeriodStart,
              currentPeriodEnd: (sub as { currentPeriodEnd: Date }).currentPeriodEnd,
            }
          : null,
        user: {
          id: auth.user.id,
          name: (user as { name: string }).name,
          email: (user as { email: string }).email,
          role: membership.role,
          organizationId: targetOrgId,
        },
      });
    }

    // Update active organization
    await TeamMember.findByIdAndUpdate(auth.user.id, {
      organizationId: targetOrgId,
      role: membership.role,
    });

    // Get current session to preserve sessionId
    const currentSession = await getSessionFromRequest(request);
    const sessionId = currentSession?.sessionId || "";

    // Issue new JWT with updated org context
    const token = await createSessionToken({
      userId: auth.user.id,
      email: (user as { email: string }).email,
      name: (user as { name: string }).name,
      role: membership.role as SessionRole,
      organizationId: targetOrgId,
      sessionId,
    });

    await setSessionCookie(token);

    // Fetch subscription for the target org
    const sub = await Subscription.findOne({ organizationId: targetOrgId })
      .select("plan status maxLeads maxMembers trialEndsAt currentPeriodEnd price")
      .lean();

    // Audit log
    await logAudit({
      actorId: auth.user.id,
      actorEmail: (user as { email: string }).email,
      organizationId: targetOrgId,
      action: AUDIT_ACTIONS.ORGANIZATION_SWITCHED,
      targetType: "Organization",
      targetId: targetOrgId,
      metadata: {
        previousOrgId: (user as { organizationId: string }).organizationId,
        newOrgId: targetOrgId,
        role: membership.role,
      },
    });

    return Response.json({
      success: true,
      organization: {
        id: String((org as { _id: unknown })._id),
        name: (org as { name: string }).name,
        status: (org as { status: string }).status,
        industry: (org as { industry: string }).industry,
        phone: (org as { phone: string }).phone,
        country: (org as { country: string }).country,
        logo: (org as { logo?: string }).logo || "",
        founderId: (org as { founderId: string }).founderId,
      },
      subscription: sub
        ? {
            plan: (sub as { plan: string }).plan,
            status: (sub as { status: string }).status,
            price: (sub as { price: number }).price,
            maxLeads: (sub as { maxLeads: number }).maxLeads,
            maxMembers: (sub as { maxMembers: number }).maxMembers,
            trialEndsAt: (sub as { trialEndsAt: Date | null }).trialEndsAt,
            currentPeriodStart: (sub as { currentPeriodStart: Date }).currentPeriodStart,
            currentPeriodEnd: (sub as { currentPeriodEnd: Date }).currentPeriodEnd,
          }
        : null,
      user: {
        id: auth.user.id,
        name: (user as { name: string }).name,
        email: (user as { email: string }).email,
        role: membership.role,
        organizationId: targetOrgId,
      },
    });
  } catch (error) {
    console.error("Switch organization error:", error);
    return jsonError("Failed to switch organization", 500);
  }
}
