import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import JoinToken, { hashToken } from "@/models/JoinToken";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import { requireAuth, checkMemberLimit } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";
import { createSessionToken, setSessionCookie, getSessionFromRequest } from "@/lib/auth";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * POST /api/auth/join/accept
 * Accept a join invitation token.
 *
 * The user must be authenticated (logged in or just signed up).
 * Their identity comes from the server-side session — never trusted from body.
 *
 * Body: { token: string }
 */
export async function POST(request: NextRequest) {
  // Must be authenticated to accept join
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user } = auth;

  // Get the current session to preserve sessionId
  const currentSession = await getSessionFromRequest(request);
  const currentSessionId = currentSession?.sessionId || "";

  // SERENE_OWNER cannot join a customer org
  if (user.role === "SERENE_OWNER") {
    return jsonError("Serene Owners cannot join customer organizations", 403);
  }

  // Already has an org — only allow if they have no real org (e.g. edge case)
  // In normal flow: a new user has no org yet, or could be joining a second org
  // For safety: prevent re-joining if already in a different org
  if (
    user.organizationId &&
    user.organizationId !== "__pending__" &&
    user.organizationId !== ""
  ) {
    return jsonError(
      "You are already a member of an organization. Contact support to switch organizations.",
      409
    );
  }

  try {
    const body = await request.json();
    const rawToken = (body.token || "").trim();

    if (!rawToken) {
      return jsonError("Join token is required", 400);
    }

    await connectDB();

    const tokenHash = hashToken(rawToken);
    const joinToken = await JoinToken.findOne({ tokenHash }).lean();

    // Server-side token validation — never trust frontend
    if (!joinToken) {
      return jsonError("Invalid join link", 404);
    }
    if (joinToken.status !== "active") {
      return jsonError(`This join link has been ${joinToken.status}`, 410);
    }
    if (new Date() > joinToken.expiresAt) {
      await JoinToken.findByIdAndUpdate(joinToken._id, { status: "used" });
      return jsonError("This join link has expired", 410);
    }

    // Verify organization is active
    const org = await Organization.findById(joinToken.organizationId)
      .select("name status")
      .lean();
    if (!org) {
      return jsonError("Organization not found", 404);
    }
    if ((org as { status: string }).status === "SUSPENDED") {
      return jsonError("This organization is currently suspended", 403);
    }

    // Check member limit before joining
    const limitCheck = await checkMemberLimit(joinToken.organizationId);
    if (!limitCheck.allowed) {
      return jsonError(
        limitCheck.reason || "Member limit reached for this organization",
        403
      );
    }

    // Assign user to org with the token's role
    await TeamMember.findByIdAndUpdate(user.id, {
      organizationId: joinToken.organizationId,
      role: joinToken.role,
      status: "active",
    });

    // Mark token as used
    await JoinToken.findByIdAndUpdate(joinToken._id, {
      status: "used",
      usedAt: new Date(),
      usedBy: user.id,
    });

    // Refresh session token with new org + role
    const newToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: joinToken.role,
      organizationId: joinToken.organizationId,
      sessionId: currentSessionId,
    });
    await setSessionCookie(newToken);

    // Audit log
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      organizationId: joinToken.organizationId,
      action: AUDIT_ACTIONS.MEMBER_JOINED,
      targetType: "Organization",
      targetId: joinToken.organizationId,
      metadata: { role: joinToken.role, orgName: (org as { name: string }).name },
    });

    return Response.json({
      success: true,
      organizationId: joinToken.organizationId,
      organizationName: (org as { name: string }).name,
      role: joinToken.role,
    });
  } catch (error) {
    console.error("Join accept error:", error);
    return jsonError("Failed to process join request", 500);
  }
}
