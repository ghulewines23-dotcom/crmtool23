import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import JoinToken, {
  hashToken,
  generateRawToken,
  type JoinRole,
} from "@/models/JoinToken";
import Organization from "@/models/Organization";
import { requireFounder } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * POST /api/auth/join
 * Generate a secure join link (FOUNDER only).
 */
export async function POST(request: NextRequest) {
  const auth = await requireFounder(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const body = await request.json();
    const role: JoinRole = body.role;

    if (!role || !["ADMIN", "SALES_PERSON"].includes(role)) {
      return jsonError("Role must be ADMIN or SALES_PERSON", 400);
    }

    // Generate token
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await JoinToken.create({
      tokenHash,
      organizationId: auth.user.organizationId,
      role,
      createdBy: auth.user.id,
      expiresAt,
      status: "active",
    });

    // Audit log
    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      organizationId: auth.user.organizationId,
      action: AUDIT_ACTIONS.JOIN_TOKEN_CREATED,
      targetType: "JoinToken",
      metadata: { role, expiresAt },
    });

    // Return the raw token (only time it's visible)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const joinUrl = `${baseUrl}/join?token=${rawToken}`;

    return Response.json({
      success: true,
      token: rawToken,
      joinUrl,
      role,
      expiresAt,
    });
  } catch (error) {
    console.error("Join token creation error:", error);
    return jsonError("Failed to generate join link", 500);
  }
}

/**
 * GET /api/auth/join?token=xxx
 * Validate a join token (public — used before auth to show org info).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get("token");

  if (!rawToken) {
    return jsonError("Token is required", 400);
  }

  try {
    await connectDB();

    const tokenHash = hashToken(rawToken);
    const joinToken = await JoinToken.findOne({ tokenHash }).lean();

    if (!joinToken) {
      return jsonError("Invalid or expired join link", 404);
    }

    if (joinToken.status !== "active") {
      return jsonError(
        `This join link has been ${joinToken.status}`,
        410
      );
    }

    if (new Date() > joinToken.expiresAt) {
      // Mark as expired lazily
      await JoinToken.findByIdAndUpdate(joinToken._id, { status: "used" });
      return jsonError("This join link has expired", 410);
    }

    // Get org info to show the user what they're joining
    const org = await Organization.findById(joinToken.organizationId)
      .select("name status")
      .lean();

    if (!org) {
      return jsonError("Organization not found", 404);
    }

    if ((org as { status: string }).status === "SUSPENDED") {
      return jsonError("This organization is currently suspended", 403);
    }

    return Response.json({
      success: true,
      organizationName: (org as { name: string }).name,
      role: joinToken.role,
      expiresAt: joinToken.expiresAt,
    });
  } catch (error) {
    console.error("Join token validation error:", error);
    return jsonError("Failed to validate join link", 500);
  }
}

/**
 * DELETE /api/auth/join?tokenId=xxx
 * Revoke a join link (FOUNDER only).
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireFounder(request);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("tokenId");

  if (!tokenId) {
    return jsonError("tokenId is required", 400);
  }

  try {
    await connectDB();

    const joinToken = await JoinToken.findOneAndUpdate(
      {
        _id: tokenId,
        organizationId: auth.user.organizationId, // tenant isolation
        status: "active",
      },
      { status: "revoked", revokedAt: new Date() },
      { new: true }
    );

    if (!joinToken) {
      return jsonError("Join token not found or already inactive", 404);
    }

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      organizationId: auth.user.organizationId,
      action: AUDIT_ACTIONS.JOIN_TOKEN_REVOKED,
      targetType: "JoinToken",
      targetId: tokenId,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Join token revoke error:", error);
    return jsonError("Failed to revoke join link", 500);
  }
}
