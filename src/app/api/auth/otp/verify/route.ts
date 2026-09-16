import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import OtpToken, { hashOtp } from "@/models/OtpToken";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import {
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
    const otp = (body.otp || "").trim();

    if (!email || !otp) {
      return jsonError("Email and OTP are required", 400);
    }

    // Rate limit by IP + email
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rlKey = `otp-verify:${ip}:${email}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) {
      const minutes = Math.ceil(rl.retryAfterMs / 60000);
      return jsonError(
        `Too many verification attempts. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        429
      );
    }

    await connectDB();

    // Find the user by email
    const user = await TeamMember.findOne({ email });
    if (!user) {
      return jsonError("Account not found", 404);
    }

    if (user.status !== "active") {
      return jsonError("Your account is inactive.", 403);
    }

    // Find the most recent unused OTP for this user
    const otpRecord = await OtpToken.findOne({
      userId: String(user._id),
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean();

    if (!otpRecord) {
      return jsonError("No valid OTP found. Please request a new one.", 404);
    }

    // Check attempts (max 5 per OTP)
    if (otpRecord.attempts >= 5) {
      await OtpToken.findByIdAndUpdate(otpRecord._id, { used: true });
      return jsonError("Too many failed attempts. Please request a new OTP.", 429);
    }

    // Verify OTP hash
    const inputHash = hashOtp(otp);
    if (inputHash !== otpRecord.otpHash) {
      await OtpToken.findByIdAndUpdate(otpRecord._id, {
        $inc: { attempts: 1 },
      });
      return jsonError("Invalid OTP. Please try again.", 401);
    }

    // OTP is valid. Mark it as used.
    await OtpToken.findByIdAndUpdate(otpRecord._id, { used: true });

    // Generate new session ID and atomically update the user's active session.
    // This invalidates ALL previous sessions.
    const newSessionId = generateSessionId();

    const updateResult = await TeamMember.findByIdAndUpdate(
      user._id,
      { activeSessionId: newSessionId },
      { new: true }
    );

    if (!updateResult) {
      return jsonError("Failed to create session", 500);
    }

    // Fetch organization and subscription
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

    // Create JWT with new session ID
    const token = await createSessionToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      sessionId: newSessionId,
    });

    await setSessionCookie(token);

    // Audit log — new device login, previous session invalidated
    await logAudit({
      actorId: String(user._id),
      actorEmail: user.email,
      organizationId: user.organizationId || null,
      action: AUDIT_ACTIONS.LOGIN_NEW_DEVICE,
      targetType: "User",
      targetId: String(user._id),
      metadata: {
        ip,
        previousSessionInvalidated: true,
        newDeviceCreated: true,
      },
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
    console.error("OTP verify error:", error);
    return jsonError("Failed to verify OTP", 500);
  }
}
