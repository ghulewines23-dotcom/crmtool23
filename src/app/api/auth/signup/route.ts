import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import {
  hashPassword,
  createSessionToken,
  setSessionCookie,
  generateSessionId,
} from "@/lib/auth";
import { createOrgWithTrial, logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const businessName = (body.businessName || "").trim();
    const phone = (body.phone || "").trim();
    const industry = (body.industry || "").trim();

    // ── Validation ──
    if (!name || !email || !password) {
      return jsonError("Name, email, and password are required", 400);
    }
    if (!businessName) {
      return jsonError("Business name is required", 400);
    }
    if (password.length < 8) {
      return jsonError("Password must be at least 8 characters", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Invalid email address", 400);
    }

    await connectDB();

    // ── Global email uniqueness check ──
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

    // ── Create user with a temporary placeholder orgId ──
    // We'll update it after creating the org
    const member = await TeamMember.create({
      name,
      email,
      phone,
      role: "FOUNDER",
      avatar: initials,
      status: "active",
      organizationId: "__pending__", // will be updated below
      passwordHash,
    });

    const founderId = String(member._id);

    // ── Create Organization + FREE_TRIAL Subscription ──
    const { organization, subscription } = await createOrgWithTrial({
      name: businessName,
      founderId,
      industry,
      phone,
    });

    // ── Update user with real organizationId ──
    await TeamMember.findByIdAndUpdate(founderId, {
      organizationId: organization.id,
    });

    // ── Create session ──
    const sessionId = generateSessionId();

    // Store the session ID on the user
    await TeamMember.findByIdAndUpdate(founderId, {
      activeSessionId: sessionId,
    });

    const token = await createSessionToken({
      userId: founderId,
      email: member.email,
      name: member.name,
      role: "FOUNDER",
      organizationId: organization.id,
      sessionId,
    });

    await setSessionCookie(token);

    // ── Audit log ──
    await logAudit({
      actorId: founderId,
      actorEmail: email,
      organizationId: organization.id,
      action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
      targetType: "Organization",
      targetId: organization.id,
      metadata: { orgName: businessName, plan: "FREE_TRIAL" },
    });

    await logAudit({
      actorId: founderId,
      actorEmail: email,
      organizationId: organization.id,
      action: AUDIT_ACTIONS.USER_SIGNUP,
      targetType: "User",
      targetId: founderId,
    });

    return Response.json(
      {
        success: true,
        user: {
          id: founderId,
          name: member.name,
          email: member.email,
          role: "FOUNDER",
          avatar: member.avatar,
          phone: member.phone,
          organizationId: organization.id,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          status: organization.status,
        },
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt,
          maxLeads: 20,
          maxMembers: 1,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Signup error:", error);

    // Handle MongoDB duplicate key error (E11000)
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
