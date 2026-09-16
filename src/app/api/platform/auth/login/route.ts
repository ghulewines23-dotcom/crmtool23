import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * POST /api/platform/auth/login
 * Owner login — email + password, must be SERENE_OWNER role, status active.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return jsonError("Email and password are required", 400);
    }

    await connectDB();

    const user = await TeamMember.findOne({ email }).lean();
    if (!user) {
      return jsonError("Invalid email or password", 401);
    }

    if (user.role !== "SERENE_OWNER") {
      return jsonError("This account is not an owner account", 403);
    }

    if (user.status !== "active") {
      return jsonError("Account is not active", 403);
    }

    const passwordHash = (user as { passwordHash: string }).passwordHash;
    if (!passwordHash) {
      return jsonError("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, passwordHash);
    if (!valid) {
      await logAudit({
        actorId: String(user._id),
        actorEmail: email,
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        targetType: "User",
        targetId: String(user._id),
      });
      return jsonError("Invalid email or password", 401);
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const token = await createSessionToken({
      userId: String(user._id),
      email: user.email,
      name: (user as { name: string }).name,
      role: user.role,
      organizationId: "",
      sessionId,
    });

    await setSessionCookie(token);

    // Update active session
    await TeamMember.findByIdAndUpdate(user._id, { activeSessionId: sessionId });

    await logAudit({
      actorId: String(user._id),
      actorEmail: email,
      action: AUDIT_ACTIONS.USER_LOGIN,
      targetType: "User",
      targetId: String(user._id),
      metadata: { role: "SERENE_OWNER" },
    });

    return Response.json({
      success: true,
      user: {
        id: String(user._id),
        name: (user as { name: string }).name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Owner login error:", error);
    return jsonError("Login failed. Please try again.", 500);
  }
}
