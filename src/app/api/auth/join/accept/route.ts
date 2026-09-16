import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import JoinToken, { hashToken } from "@/models/JoinToken";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import Notification from "@/models/Notification";
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

    // Validate email matches the invitation recipient
    const recipientEmail = (joinToken as { recipientEmail?: string }).recipientEmail;
    if (recipientEmail && recipientEmail !== user.email) {
      return jsonError("This invitation was sent to a different email address", 403);
    }

    // Verify organization is active
    const org = await Organization.findById(joinToken.organizationId)
      .select("name status founderId")
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

    // Fetch the full user document to work with organizations array
    const fullUser = await TeamMember.findById(user.id).lean();
    if (!fullUser) {
      return jsonError("User not found", 404);
    }

    // Lazy-initialize organizations array from legacy organizationId
    let memberships = (fullUser as { organizations?: Array<{ organizationId: string; role: string; joinedAt: Date }> }).organizations || [];
    if (memberships.length === 0 && (fullUser as { organizationId: string }).organizationId) {
      const legacyOrgId = (fullUser as { organizationId: string }).organizationId;
      memberships = [{ organizationId: legacyOrgId, role: (fullUser as { role: string }).role, joinedAt: new Date() }];
    }

    // Check if already a member of this org
    const alreadyMember = memberships.some((m) => m.organizationId === joinToken.organizationId);
    if (alreadyMember) {
      return jsonError("You are already a member of this organization", 409);
    }

    // Add to organizations array
    const newMembership = {
      organizationId: joinToken.organizationId,
      role: joinToken.role,
      joinedAt: new Date(),
    };

    const updateOps: Record<string, unknown> = {
      $push: { organizations: newMembership },
      status: "active",
    };

    // If user has no active org yet, set this as their active org
    if (
      !(fullUser as { organizationId: string }).organizationId ||
      (fullUser as { organizationId: string }).organizationId === "__pending__" ||
      (fullUser as { organizationId: string }).organizationId === ""
    ) {
      updateOps.organizationId = joinToken.organizationId;
      updateOps.role = joinToken.role;
    }

    await TeamMember.findByIdAndUpdate(user.id, updateOps);

    // Mark token as used
    await JoinToken.findByIdAndUpdate(joinToken._id, {
      status: "used",
      usedAt: new Date(),
      usedBy: user.id,
    });

    // Create notification for the founder about the new member
    const founderId = (org as { founderId: string }).founderId;
    if (founderId) {
      await Notification.create({
        userId: founderId,
        type: "member_joined",
        title: "New Team Member",
        message: `${user.name} has joined ${(org as { name: string }).name} as ${joinToken.role === "ADMIN" ? "Admin" : "Sales Person"}.`,
        organizationId: joinToken.organizationId,
        read: false,
      });
    }

    // Mark any invitation notifications for this user as read
    await Notification.updateMany(
      {
        userId: user.id,
        invitationId: rawToken,
        read: false,
      },
      { read: true }
    );

    // If this was the user's first org, refresh the session with the new org
    if (updateOps.organizationId) {
      const newToken = await createSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: joinToken.role,
        organizationId: joinToken.organizationId,
        sessionId: currentSessionId,
      });
      await setSessionCookie(newToken);
    }

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
