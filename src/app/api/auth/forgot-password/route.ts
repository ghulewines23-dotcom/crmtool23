import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import PasswordResetToken, { generateResetToken, hashResetToken } from "@/models/PasswordResetToken";
import { sendEmail, buildPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return jsonError("Email is required", 400);
    }

    // Rate limit by IP + email
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rlKey = `forgot-pw:${ip}:${email}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) {
      const minutes = Math.ceil(rl.retryAfterMs / 60000);
      return jsonError(
        `Too many requests. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        429
      );
    }

    await connectDB();

    // Always return generic response to prevent email enumeration
    const genericResponse = {
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    };

    // Find user by email
    const user = await TeamMember.findOne({ email }).lean();
    if (!user) {
      // Return generic response even if user not found
      return Response.json(genericResponse);
    }

    if (user.status !== "active") {
      // Return generic response even if account is inactive
      return Response.json(genericResponse);
    }

    // Invalidate any previous unused reset tokens for this user
    await PasswordResetToken.updateMany(
      { userId: String(user._id), used: false },
      { used: true }
    );

    // Generate cryptographically secure reset token
    const resetToken = generateResetToken();
    const tokenHash = hashResetToken(resetToken);

    // Store hashed token with 1-hour expiry
    await PasswordResetToken.create({
      userId: String(user._id),
      email: user.email,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      used: false,
    });

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send email
    const emailContent = buildPasswordResetEmail(resetUrl);
    const emailSent = await sendEmail({
      to: user.email,
      ...emailContent,
    });

    if (!emailSent) {
      console.error(`[PasswordReset] Failed to send reset email to ${user.email}. Check RESEND_API_KEY configuration.`);
    }

    // Audit log
    await logAudit({
      actorId: String(user._id),
      actorEmail: user.email,
      organizationId: user.organizationId || null,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      targetType: "User",
      targetId: String(user._id),
      metadata: { ip, emailSent },
    });

    return Response.json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    return jsonError("Failed to process request", 500);
  }
}
