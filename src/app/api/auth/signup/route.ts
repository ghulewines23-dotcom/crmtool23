import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import { hashPassword } from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * POST /api/auth/signup
 * Public — creates a user with pending_access status in Serene Agency.
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

    const existing = await TeamMember.findOne({ email }).lean();
    if (existing) {
      return jsonError("An account with this email already exists", 409);
    }

    // Find Serene Agency org
    const org = await Organization.findOne({ name: "Serene Agency" }).lean();
    const orgId = org ? String((org as { _id: unknown })._id) : "";

    const passwordHash = await hashPassword(password);
    const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

    const member = await TeamMember.create({
      name,
      email,
      role: "SALES_PERSON",
      avatar: initials,
      status: "pending_access",
      organizationId: orgId,
      organizations: orgId ? [{ organizationId: orgId, role: "SALES_PERSON", joinedAt: new Date() }] : [],
      passwordHash,
    });

    await logAudit({
      actorId: String(member._id),
      actorEmail: email,
      action: AUDIT_ACTIONS.USER_SIGNUP,
      targetType: "User",
      targetId: String(member._id),
    });

    return Response.json(
      { success: true, message: "Account created. Waiting for approval." },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Signup error:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: number }).code === 11000) {
      return jsonError("An account with this email already exists", 409);
    }
    return jsonError("Signup failed. Please try again.", 500);
  }
}
