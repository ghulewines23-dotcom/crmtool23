import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import { hashPassword } from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * POST /api/platform/auth/signup
 * Owner signup — creates a SERENE_OWNER account.
 * Only allowed if no owner exists yet.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!name || !email || !password) {
      return jsonError("Name, email, and password are required", 400);
    }
    if (password.length < 8) {
      return jsonError("Password must be at least 8 characters", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Invalid email address", 400);
    }

    await connectDB();

    // Check if owner already exists
    const existingOwner = await TeamMember.findOne({ role: "SERENE_OWNER" }).lean();
    if (existingOwner) {
      return jsonError("Owner account already exists. Please login.", 409);
    }

    // Check if email is taken
    const existing = await TeamMember.findOne({ email }).lean();
    if (existing) {
      return jsonError("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);
    const initials = name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const member = await TeamMember.create({
      name,
      email,
      role: "SERENE_OWNER",
      avatar: initials,
      status: "active",
      organizationId: "",
      organizations: [],
      passwordHash,
      canAccessCRM: true,
      canCreateOrganization: true,
      canJoinOrganization: true,
    });

    await logAudit({
      actorId: String(member._id),
      actorEmail: email,
      action: AUDIT_ACTIONS.USER_SIGNUP,
      targetType: "User",
      targetId: String(member._id),
      metadata: { role: "SERENE_OWNER" },
    });

    return Response.json(
      {
        success: true,
        message: "Owner account created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Owner signup error:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return jsonError("An account with this email already exists", 409);
    }
    return jsonError("Signup failed. Please try again.", 500);
  }
}
