import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/auth";

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

    // Email-based password reset is currently disabled.
    // Return a generic message — no DB lookup, no email sent.
    return Response.json({
      success: true,
      message: "Password reset is currently unavailable. Please contact your organization owner to reset your password.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return jsonError("Failed to process request", 500);
  }
}
