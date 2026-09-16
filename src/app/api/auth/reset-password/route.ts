import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import PasswordResetToken, { hashResetToken } from "@/models/PasswordResetToken";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = (body.token || "").trim();
    const password = body.password || "";

    if (!token || !password) {
      return jsonError("Token and password are required", 400);
    }

    if (password.length < 8) {
      return jsonError("Password must be at least 8 characters", 400);
    }

    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rlKey = `reset-pw:${ip}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) {
      const minutes = Math.ceil(rl.retryAfterMs / 60000);
      return jsonError(
        `Too many requests. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        429
      );
    }

    await connectDB();

    // Hash the submitted token to look it up
    const tokenHash = hashResetToken(token);

    // Find the reset token record
    const resetRecord = await PasswordResetToken.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!resetRecord) {
      return jsonError("Invalid or expired reset token", 400);
    }

    // Find the user
    const user = await TeamMember.findById(resetRecord.userId);
    if (!user) {
      return jsonError("Account not found", 404);
    }

    if (user.status !== "active") {
      return jsonError("Account is inactive", 403);
    }

    // Mark the reset token as used
    await PasswordResetToken.findByIdAndUpdate(resetRecord._id, { used: true });

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update password and invalidate ALL active sessions
    await TeamMember.findByIdAndUpdate(user._id, {
      passwordHash,
      activeSessionId: "", // Invalidate all sessions
    });

    // Audit log
    await logAudit({
      actorId: String(user._id),
      actorEmail: user.email,
      organizationId: user.organizationId || null,
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      targetType: "User",
      targetId: String(user._id),
      metadata: { ip, allSessionsInvalidated: true },
    });

    return Response.json({
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return jsonError("Failed to reset password", 500);
  }
}
