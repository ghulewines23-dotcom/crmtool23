import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  generateSessionId,
  checkRateLimit,
} from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return jsonError("Email and password are required", 400);
    }

    // Rate limit by IP + email
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rlKey = `login:${ip}:${email}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) {
      const seconds = Math.ceil(rl.retryAfterMs / 1000);
      return jsonError(
        `Too many login attempts. Try again in ${seconds} second${seconds > 1 ? "s" : ""}.`,
        429
      );
    }

    await connectDB();

    // Find user by global email
    const user = await TeamMember.findOne({ email });
    if (!user) {
      return jsonError("Invalid email or password", 401);
    }

    if (!user.passwordHash) {
      return jsonError("Invalid email or password", 401);
    }

    // Check account status
    if (user.status === "pending_access") {
      return jsonError("Your account is pending administrator approval. Please contact your organization owner.", 403);
    }

    if (user.status === "suspended") {
      return jsonError("Your account has been suspended. Please contact your organization owner.", 403);
    }

    if (user.status !== "active") {
      return jsonError("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      // Audit failed login attempt
      await logAudit({
        actorId: String(user._id),
        actorEmail: user.email,
        organizationId: user.organizationId || null,
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        targetType: "User",
        targetId: String(user._id),
        metadata: { ip, reason: "invalid_password" },
      });
      return jsonError("Invalid email or password", 401);
    }

    // Password is correct. Create session directly.
    const sessionId = generateSessionId();

    // Store the session ID on the user
    await TeamMember.findByIdAndUpdate(user._id, {
      activeSessionId: sessionId,
    });

    // Create JWT with sessionId
    const token = await createSessionToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      sessionId,
    });

    await setSessionCookie(token);

    // Audit log
    await logAudit({
      actorId: String(user._id),
      actorEmail: user.email,
      organizationId: user.organizationId || null,
      action: AUDIT_ACTIONS.USER_LOGIN,
      targetType: "User",
      targetId: String(user._id),
      metadata: { ip, method: "password" },
    });

    return Response.json({
      success: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar:
          user.avatar ||
          user.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        phone: user.phone,
        organizationId: user.organizationId,
      },
      organization: null,
      subscription: null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return jsonError("Login failed", 500);
  }
}
