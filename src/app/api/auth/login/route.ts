import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import OtpToken, { generateOtp, hashOtp } from "@/models/OtpToken";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  generateSessionId,
  checkRateLimit,
} from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";
import { sendEmail, buildOtpEmail } from "@/lib/email";

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
      const minutes = Math.ceil(rl.retryAfterMs / 60000);
      return jsonError(
        `Too many login attempts. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
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

    if (user.status !== "active") {
      return jsonError("Your account is inactive. Contact your organization admin.", 403);
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

    // Password is correct. Check if there's already an active session.
    // If activeSessionId is set, another device may be logged in.
    // Send OTP to verify identity before allowing new device.
    if (user.activeSessionId) {
      // Invalidate any previous OTP for this user
      await OtpToken.updateMany(
        { userId: String(user._id), used: false },
        { used: true }
      );

      // Generate and store OTP
      const otp = generateOtp();
      const otpHash = hashOtp(otp);

      await OtpToken.create({
        userId: String(user._id),
        email: user.email,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        used: false,
        attempts: 0,
      });

      // Audit OTP requested
      await logAudit({
        actorId: String(user._id),
        actorEmail: user.email,
        organizationId: user.organizationId || null,
        action: AUDIT_ACTIONS.OTP_REQUESTED,
        targetType: "User",
        targetId: String(user._id),
        metadata: { ip, reason: "new_device" },
      });

      // Send OTP via email
      const emailSent = await sendOtpEmail(user.email, otp);

      if (!emailSent) {
        console.error(`[Auth] Failed to send OTP email to user ${String(user._id)}. Check RESEND_API_KEY and EMAIL_FROM configuration.`);
        return jsonError("Failed to send verification email. Please try again.", 500);
      }

      // Mask email for response (show first 2 chars + domain)
      const [localPart, domain] = user.email.split("@");
      const maskedEmail = `${localPart.slice(0, 2)}${"*".repeat(Math.max(0, localPart.length - 2))}@${domain}`;

      return Response.json({
        success: true,
        requiresOtp: true,
        maskedEmail,
        message: `Verification code sent to ${maskedEmail}`,
      });
    }

    // No active session — first login or after manual logout.
    // Create session directly.
    const sessionId = generateSessionId();

    // Store the session ID on the user
    await TeamMember.findByIdAndUpdate(user._id, {
      activeSessionId: sessionId,
    });

    // Fetch organization and subscription (real DB values)
    let organization = null;
    let subscription = null;

    if (user.organizationId && user.organizationId !== "__pending__") {
      const [org, sub] = await Promise.all([
        Organization.findById(user.organizationId)
          .select("name status industry phone country")
          .lean(),
        Subscription.findOne({ organizationId: user.organizationId })
          .select("plan status maxLeads maxMembers trialEndsAt currentPeriodEnd")
          .lean(),
      ]);
      organization = org;
      subscription = sub;
    }

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
      organization: organization
        ? {
            id: String((organization as { _id: unknown })._id),
            name: (organization as { name: string }).name,
            status: (organization as { status: string }).status,
            industry: (organization as { industry: string }).industry,
            phone: (organization as { phone: string }).phone,
            country: (organization as { country: string }).country,
          }
        : null,
      subscription: subscription
        ? {
            plan: (subscription as { plan: string }).plan,
            status: (subscription as { status: string }).status,
            maxLeads: (subscription as { maxLeads: number }).maxLeads,
            maxMembers: (subscription as { maxMembers: number }).maxMembers,
            trialEndsAt: (subscription as { trialEndsAt: Date | null }).trialEndsAt,
            currentPeriodEnd: (subscription as { currentPeriodEnd: Date }).currentPeriodEnd,
          }
        : null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return jsonError("Login failed", 500);
  }
}

async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  const emailContent = buildOtpEmail(otp);
  return sendEmail({ to: email, ...emailContent });
}
