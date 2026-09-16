import { NextRequest } from "next/server";
import { getSessionFromRequest, type SessionRole } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import Subscription from "@/models/Subscription";

// ─── ApiUser ────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: SessionRole;
  organizationId: string;
  status: "active" | "inactive" | "invited" | "pending_access" | "suspended";
}

// ─── Core auth helpers ───────────────────────────────────────────────────────

/**
 * Derives the authenticated user entirely from the server-side session +
 * database.  Never trusts role / userId / organizationId from the frontend.
 */
export async function getApiUser(request: NextRequest): Promise<ApiUser | null> {
  const session = await getSessionFromRequest(request);
  if (!session) return null;

  await connectDB();

  const user = await TeamMember.findById(session.userId)
    .select("name email role organizationId status activeSessionId")
    .lean();

  if (!user || user.status !== "active") return null;

  // Single device enforcement: reject if session ID doesn't match active session
  if (user.activeSessionId && user.activeSessionId !== session.sessionId) {
    return null;
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    status: user.status,
  };
}

export async function requireAuth(
  request: NextRequest
): Promise<{ user: ApiUser } | { error: Response }> {
  const user = await getApiUser(request);
  if (!user) {
    return {
      error: Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Require one of the specified roles.
 * Returns 401 if not logged in, 403 if logged in but wrong role.
 */
export async function requireRole(
  request: NextRequest,
  ...roles: SessionRole[]
): Promise<{ user: ApiUser } | { error: Response }> {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  if (!roles.includes(auth.user.role)) {
    return {
      error: Response.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }
  return auth;
}

/** FOUNDER or higher (within their own org) */
export async function requireFounder(
  request: NextRequest
): Promise<{ user: ApiUser } | { error: Response }> {
  return requireRole(request, "FOUNDER");
}

/** SERENE_OWNER only */
export async function requirePlatformOwner(
  request: NextRequest
): Promise<{ user: ApiUser } | { error: Response }> {
  return requireRole(request, "SERENE_OWNER");
}

// ─── Role helpers ────────────────────────────────────────────────────────────

export function isFounderOrAbove(user: ApiUser): boolean {
  return user.role === "FOUNDER" || user.role === "SERENE_OWNER";
}

export function isCustomerMember(user: ApiUser): boolean {
  return (
    user.role === "FOUNDER" ||
    user.role === "ADMIN" ||
    user.role === "SALES_PERSON"
  );
}

// ─── Tenant isolation guard ──────────────────────────────────────────────────

/**
 * Ensures the authenticated user belongs to the requested organization.
  * SERENE_OWNER bypasses this check.
 */
export function assertSameOrg(user: ApiUser, organizationId: string): boolean {
  if (user.role === "SERENE_OWNER") return true;
  return user.organizationId === organizationId;
}

// ─── Subscription limit checks ───────────────────────────────────────────────

export interface SubscriptionLimits {
  maxLeads: number;
  maxMembers: number;
  status: string;
}

export async function getSubscriptionLimits(
  organizationId: string
): Promise<SubscriptionLimits | null> {
  await connectDB();
  const sub = await Subscription.findOne({ organizationId })
    .select("maxLeads maxMembers status")
    .lean();
  if (!sub) return null;
  return {
    maxLeads: sub.maxLeads,
    maxMembers: sub.maxMembers,
    status: sub.status,
  };
}

export async function checkLeadLimit(
  organizationId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getSubscriptionLimits(organizationId);
  if (!limits) return { allowed: false, reason: "No active subscription found" };

  if (limits.status === "SUSPENDED" || limits.status === "EXPIRED" || limits.status === "CANCELLED") {
    return { allowed: false, reason: `Subscription is ${limits.status.toLowerCase()}` };
  }

  // Dynamic import to avoid circular deps
  const Lead = (await import("@/models/Lead")).default;
  const count = await Lead.countDocuments({ organizationId });

  if (count >= limits.maxLeads) {
    return {
      allowed: false,
      reason: `Lead limit reached (${count}/${limits.maxLeads}). Upgrade your plan to add more leads.`,
    };
  }
  return { allowed: true };
}

export async function checkMemberLimit(
  organizationId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getSubscriptionLimits(organizationId);
  if (!limits) return { allowed: false, reason: "No active subscription found" };

  if (limits.status === "SUSPENDED" || limits.status === "EXPIRED" || limits.status === "CANCELLED") {
    return { allowed: false, reason: `Subscription is ${limits.status.toLowerCase()}` };
  }

  const count = await TeamMember.countDocuments({
    organizationId,
    status: { $in: ["active", "invited"] },
  });

  if (count >= limits.maxMembers) {
    return {
      allowed: false,
      reason: `Member limit reached (${count}/${limits.maxMembers}). Upgrade your plan to add more members.`,
    };
  }
  return { allowed: true };
}

// ─── Subscription status guard ───────────────────────────────────────────────

/**
 * Returns an error Response if the org's subscription is not in an
 * accessible state (TRIAL or ACTIVE).  Returns null if OK.
 */
export async function requireActiveSubscription(
  organizationId: string
): Promise<Response | null> {
  const limits = await getSubscriptionLimits(organizationId);
  if (!limits) {
    return Response.json(
      { success: false, error: "No subscription found for this organization" },
      { status: 403 }
    );
  }
  const ok = limits.status === "TRIAL" || limits.status === "ACTIVE";
  if (!ok) {
    return Response.json(
      {
        success: false,
        error: `Access denied. Subscription status: ${limits.status}`,
      },
      { status: 403 }
    );
  }
  return null;
}
