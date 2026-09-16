import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import { requireFounder, checkMemberLimit, requireActiveSubscription } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/team
 * List team members for the authenticated user's organization.
 * FOUNDER, ADMIN, SALES_PERSON can all see the team list.
 */
export async function GET(request: NextRequest) {
  // Any authenticated customer role can see the team
  const { requireAuth } = await import("@/lib/api-auth");
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (auth.user.role === "SERENE_OWNER") {
    return jsonError("Use /api/platform/users for cross-org access", 403);
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const query: Record<string, unknown> = {
      organizationId: auth.user.organizationId,
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
 * Invite a new member (FOUNDER only).
 * Creates user account without password — they set it via join link.
 */
export async function POST(request: NextRequest) {
  const auth = await requireFounder(request);
  if ("error" in auth) return auth.error;

  // Check subscription status
  const subCheck = await requireActiveSubscription(auth.user.organizationId);
  if (subCheck) return subCheck;

  // Check member limit
  const limitCheck = await checkMemberLimit(auth.user.organizationId);
  if (!limitCheck.allowed) {
    return jsonError(limitCheck.reason || "Member limit reached", 403);
  }

  try {
    await connectDB();

    const body = await request.json();

    if (!body.name || !body.email) {
      return jsonError("Name and email are required", 400);
    }

    // Cannot assign SERENE_OWNER role through this endpoint
    const role = body.role || "SALES_PERSON";
    if (!["ADMIN", "SALES_PERSON"].includes(role)) {
      return jsonError(
        "Invalid role. Must be ADMIN or SALES_PERSON",
        400
      );
    }

    // Global email uniqueness check
    const existing = await TeamMember.findOne({
      email: body.email.trim().toLowerCase(),
    }).lean();

    if (existing) {
      return jsonError("A user with this email already exists", 409);
    }

    const initials = body.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const member = await TeamMember.create({
      name: body.name,
      email: body.email.trim().toLowerCase(),
      phone: body.phone || "",
      role,
      avatar: initials,
      status: "invited",
      organizationId: auth.user.organizationId,
      passwordHash: "", // Set when they accept the invite
    });

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      organizationId: auth.user.organizationId,
      action: AUDIT_ACTIONS.MEMBER_JOINED,
      targetType: "User",
      targetId: String(member._id),
      metadata: { name: body.name, email: body.email, role },
    });

    return Response.json(
      {
        success: true,
        member: { ...member.toObject(), id: String(member._id) },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating team member:", error);
    const err = error as { code?: number; message?: string };
    if (err.code === 11000) {
      return jsonError("A user with this email already exists", 409);
    }
    return jsonError("Failed to create team member", 500);
  }
}
