import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import JoinToken, { hashToken } from "@/models/JoinToken";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * POST /api/auth/join
 * Public — invited person creates their account using the invite token.
 *
 * Body: { token: string, name: string, password: string }
 * Creates a TeamMember with status "pending_access".
 * They can only log in after owner approves them.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawToken = (body.token || "").trim();
    const name = (body.name || "").trim();
    const password = body.password || "";

    if (!rawToken) return jsonError("Join token is required", 400);
    if (!name) return jsonError("Name is required", 400);
    if (!password || password.length < 6) return jsonError("Password must be at least 6 characters", 400);

    await connectDB();

    // Validate token
    const tokenHash = hashToken(rawToken);
    const joinToken = await JoinToken.findOne({ tokenHash }).lean();
    if (!joinToken) return jsonError("Invalid or expired join link", 404);
    if (joinToken.status !== "active") return jsonError(`This join link has been ${joinToken.status}`, 410);
    if (new Date() > joinToken.expiresAt) {
      await JoinToken.findByIdAndUpdate(joinToken._id, { status: "used" });
      return jsonError("This join link has expired", 410);
    }

    // Check if user already exists with this email
    const existing = await TeamMember.findOne({ email: joinToken.recipientEmail }).lean();
    if (existing) {
      return jsonError("An account with this email already exists. Please log in.", 409);
    }

    // Verify organization is active
    const org = await Organization.findById(joinToken.organizationId).select("name status").lean();
    if (!org) return jsonError("Organization not found", 404);
    if ((org as { status: string }).status === "SUSPENDED") return jsonError("This organization is currently suspended", 403);

    // Create user with pending_access status
    const bcrypt = (await import("bcryptjs")).default;
    const passwordHash = await bcrypt.hash(password, 12);
    const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    const user = await TeamMember.create({
      name,
      email: joinToken.recipientEmail,
      phone: "",
      role: joinToken.role,
      avatar: initials,
      status: "pending_access",
      organizationId: joinToken.organizationId,
      passwordHash,
    });

    // Mark token as used
    await JoinToken.findByIdAndUpdate(joinToken._id, {
      status: "used",
      usedAt: new Date(),
      usedBy: String(user._id),
    });

    // Audit log
    await logAudit({
      actorId: String(user._id),
      actorEmail: joinToken.recipientEmail,
      organizationId: joinToken.organizationId,
      action: AUDIT_ACTIONS.MEMBER_JOINED,
      targetType: "User",
      targetId: String(user._id),
      metadata: { name, email: joinToken.recipientEmail, role: joinToken.role, orgName: (org as { name: string }).name },
    });

    return Response.json({
      success: true,
      message: "Account created. Waiting for owner approval.",
      status: "pending_access",
    });
  } catch (error) {
    console.error("Join error:", error);
    return jsonError("Failed to create account", 500);
  }
}

/**
 * GET /api/auth/join?token=xxx
 * Public — validate a join token and show org info.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get("token");

  if (!rawToken) return jsonError("Token is required", 400);

  try {
    await connectDB();

    const tokenHash = hashToken(rawToken);
    const joinToken = await JoinToken.findOne({ tokenHash }).lean();

    if (!joinToken) return jsonError("Invalid or expired join link", 404);
    if (joinToken.status !== "active") return jsonError(`This join link has been ${joinToken.status}`, 410);
    if (new Date() > joinToken.expiresAt) {
      await JoinToken.findByIdAndUpdate(joinToken._id, { status: "used" });
      return jsonError("This join link has expired", 410);
    }

    // Check if user already exists with this email
    const existingUser = await TeamMember.findOne({ email: joinToken.recipientEmail }).lean();

    const org = await Organization.findById(joinToken.organizationId).select("name status").lean();
    if (!org) return jsonError("Organization not found", 404);
    if ((org as { status: string }).status === "SUSPENDED") return jsonError("This organization is currently suspended", 403);

    return Response.json({
      success: true,
      organizationName: (org as { name: string }).name,
      role: joinToken.role,
      email: joinToken.recipientEmail,
      expiresAt: joinToken.expiresAt,
      alreadyRegistered: !!existingUser,
    });
  } catch (error) {
    console.error("Join token validation error:", error);
    return jsonError("Failed to validate join link", 500);
  }
}
