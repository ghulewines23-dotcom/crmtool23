import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import { requireAuth } from "@/lib/api-auth";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/auth/organizations
 * Returns all organizations the authenticated user belongs to.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (auth.user.role === "SERENE_OWNER") {
    return jsonError("Serene Owners do not have organization memberships", 403);
  }

  try {
    await connectDB();

    const user = await TeamMember.findById(auth.user.id)
      .select("organizations organizationId")
      .lean();

    if (!user) {
      return jsonError("User not found", 404);
    }

    // Lazy-initialize organizations array from legacy organizationId
    let memberships = (user as { organizations?: Array<{ organizationId: string; role: string; joinedAt: Date }> }).organizations || [];
    if (memberships.length === 0 && (user as { organizationId: string }).organizationId) {
      // Legacy user: initialize from single organizationId
      const legacyOrgId = (user as { organizationId: string }).organizationId;
      memberships = [{ organizationId: legacyOrgId, role: auth.user.role, joinedAt: new Date() }];
      await TeamMember.findByIdAndUpdate(auth.user.id, {
        organizations: memberships,
      });
    }

    // Fetch org details for each membership
    const orgIds = memberships.map((m) => m.organizationId);
    const [orgs, subs] = await Promise.all([
      Organization.find({ _id: { $in: orgIds } })
        .select("name status industry phone country logo founderId")
        .lean(),
      Subscription.find({ organizationId: { $in: orgIds } })
        .select("organizationId plan status maxLeads maxMembers trialEndsAt currentPeriodEnd")
        .lean(),
    ]);

    const orgMap = new Map(orgs.map((o) => [String(o._id), o]));
    const subMap = new Map(subs.map((s) => [s.organizationId, s]));

    const organizations = memberships.map((m) => {
      const org = orgMap.get(m.organizationId);
      const sub = subMap.get(m.organizationId);
      return {
        id: m.organizationId,
        name: org?.name || "Unknown Organization",
        status: org?.status || "ACTIVE",
        industry: org?.industry || "",
        role: m.role,
        isActive: m.organizationId === (user as { organizationId: string }).organizationId,
        joinedAt: m.joinedAt,
        subscription: sub
          ? {
              plan: sub.plan,
              status: sub.status,
              maxLeads: sub.maxLeads,
              maxMembers: sub.maxMembers,
              trialEndsAt: sub.trialEndsAt,
              currentPeriodEnd: sub.currentPeriodEnd,
            }
          : null,
      };
    });

    return Response.json({ success: true, organizations });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return jsonError("Failed to fetch organizations", 500);
  }
}
