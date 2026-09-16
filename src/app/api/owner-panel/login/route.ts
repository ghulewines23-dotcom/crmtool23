import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import {
  createSessionToken,
  setSessionCookie,
  generateSessionId,
  checkRateLimit,
} from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!username || !password) {
      return jsonError("Username and password are required", 400);
    }

    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rlKey = `owner-login:${ip}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) {
      const minutes = Math.ceil(rl.retryAfterMs / 60000);
      return jsonError(
        `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        429
      );
    }

    // Verify credentials against environment variables
    const validUsername = process.env.OWNER_USERNAME;
    const validPasswordHash = process.env.OWNER_PASSWORD_HASH;

    if (!validUsername || !validPasswordHash) {
      console.error("[OwnerPanel] OWNER_USERNAME or OWNER_PASSWORD_HASH not configured in environment.");
      return jsonError("Owner panel is not configured.", 500);
    }

    if (username !== validUsername) {
      return jsonError("Invalid credentials", 401);
    }

    const passwordValid = await bcrypt.compare(password, validPasswordHash);
    if (!passwordValid) {
      return jsonError("Invalid credentials", 401);
    }

    // Credentials valid. Find or create the SERENE_OWNER user in DB.
    await connectDB();

    let owner = await TeamMember.findOne({ role: "SERENE_OWNER" }).lean();

    if (!owner) {
      // Create the owner account if it doesn't exist
      const initials = "SO";
      owner = await TeamMember.create({
        name: "Serene Owner",
        email: "owner@serene-crm.com",
        role: "SERENE_OWNER",
        avatar: initials,
        status: "active",
        organizationId: "",
        organizations: [],
        passwordHash: validPasswordHash,
      });
      owner = (owner as unknown as typeof owner).toObject?.() || owner;
    }

    // Create session
    const sessionId = generateSessionId();
    await TeamMember.findByIdAndUpdate(owner._id, {
      activeSessionId: sessionId,
    });

    const token = await createSessionToken({
      userId: String(owner._id),
      email: owner.email,
      name: owner.name,
      role: "SERENE_OWNER",
      organizationId: "",
      sessionId,
    });

    await setSessionCookie(token);

    return Response.json({
      success: true,
      user: {
        id: String(owner._id),
        name: owner.name,
        email: owner.email,
        role: "SERENE_OWNER",
      },
    });
  } catch (error) {
    console.error("Owner panel login error:", error);
    return jsonError("Login failed", 500);
  }
}
