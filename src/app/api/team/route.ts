import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import JoinToken, { hashToken, generateRawToken } from "@/models/JoinToken";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import { requireFounder, checkMemberLimit, requireActiveSubscription } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/team
 * List team members for the authenticated user's organization.
 */
export async function GET(request: NextRequest) {
  const { requireAuth } = await import("@/lib/api-auth");
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const pendingOnly = searchParams.get("pending") === "true";

    const baseQuery: Record<string, unknown> = {
      organizationId: auth.user.organizationId,
    };

    // Pending approvals are only visible to org owners (FOUNDER) and the platform owner
    if (pendingOnly) {
      if (auth.user.role !== "FOUNDER" && auth.user.role !== "SERENE_OWNER") {
        return jsonError("Only the organization owner can view pending approvals", 403);
      }
      const pendingMembers = await TeamMember.find({
        ...baseQuery,
        status: "pending_access",
      })
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .lean();

      return Response.json({
        success: true,
        members: pendingMembers.map((m) => ({ ...m, id: String(m._id) })),
      }, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    const query: Record<string, unknown> = {
      $or: [
        { organizationId: auth.user.organizationId },
        { "organizations.organizationId": auth.user.organizationId },
        { _id: auth.user.id },
      ],
      status: { $ne: "pending_access" },
    };

    if (activeOnly) {
      query.status = "active";
    }

    const members = await TeamMember.find(query)
      .select("-passwordHash")
      .sort({ name: 1 })
      .lean();

    return Response.json({
      success: true,
      members: members.map((m) => ({ ...m, id: String(m._id) })),
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return Response.json(
      { success: false, error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team
 * FOUNDER invites a new member — generates invite link.
 *
 * Body: { name: string, email: string, role: "ADMIN" | "SALES_PERSON", phone?: string }
 * Returns: { inviteLink: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireFounder(request);
  if ("error" in auth) return auth.error;

  const subCheck = await requireActiveSubscription(auth.user.organizationId);
  if (subCheck) return subCheck;

  const limitCheck = await checkMemberLimit(auth.user.organizationId);
  if (!limitCheck.allowed) {
    return jsonError(limitCheck.reason || "Member limit reached", 403);
  }

  try {
    await connectDB();

    const body = await request.json();
    const { name, email, role, phone } = body;

    if (!name || !email) return jsonError("Name and email are required", 400);

    const recipientEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return jsonError("Invalid email address", 400);
    }

    const validRole = role || "SALES_PERSON";
    if (!["ADMIN", "SALES_PERSON"].includes(validRole)) {
      return jsonError("Role must be ADMIN or SALES_PERSON", 400);
    }

    // Prevent inviting yourself
    if (recipientEmail === auth.user.email) {
      return jsonError("You cannot invite yourself", 400);
    }

    // Check if user already exists with this email
    const existing = await TeamMember.findOne({ email: recipientEmail }).lean();
    if (existing) {
      return jsonError("A user with this email already exists", 409);
    }

    // Invalidate previous active invitations for this email + org
    await JoinToken.updateMany(
      { organizationId: auth.user.organizationId, recipientEmail, status: "active" },
      { status: "revoked", revokedAt: new Date() }
    );

    // Generate token
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await JoinToken.create({
      tokenHash,
      organizationId: auth.user.organizationId,
      role: validRole,
      createdBy: auth.user.id,
      recipientEmail,
      expiresAt,
      status: "active",
    });

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const inviteLink = `${baseUrl}/join?token=${rawToken}`;

    // Audit log
    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      organizationId: auth.user.organizationId,
      action: AUDIT_ACTIONS.JOIN_TOKEN_CREATED,
      targetType: "JoinToken",
      metadata: { role: validRole, recipientEmail, name },
    });

    // Create TeamMember document directly in MongoDB so member is active & visible
    const initials = name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const isSalesEligible = body.isSalesEligible !== undefined ? body.isSalesEligible : true;
    const secondaryRole = body.secondaryRole || (isSalesEligible ? "SALES_PERSON" : "");

    const newMember = await TeamMember.create({
      name,
      email: recipientEmail,
      phone: phone || "",
      role: validRole,
      avatar: initials,
      status: "active",
      organizationId: auth.user.organizationId,
      organizations: [{ organizationId: auth.user.organizationId, role: validRole, joinedAt: new Date() }],
      canAccessCRM: true,
      isSalesEligible,
      secondaryRole,
    });

    const memberObject = {
      ...newMember.toObject(),
      id: String(newMember._id),
    };

    return Response.json({
      success: true,
      member: memberObject,
      inviteLink,
      role: validRole,
      expiresAt,
      message: `Team member ${name} added successfully`,
    });
  } catch (error: unknown) {
    console.error("Error creating invite:", error);
    const err = error as { code?: number; message?: string };
    if (err.code === 11000) {
      return jsonError("A user with this email already exists", 409);
    }
    return jsonError("Failed to create invite", 500);
  }
}
