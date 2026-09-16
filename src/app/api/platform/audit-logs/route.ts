import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import AuditLog from "@/models/AuditLog";
import { requirePlatformOwner } from "@/lib/api-auth";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/platform/audit-logs
 * Global audit log access (SERENE_OWNER only).
 */
export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organizationId");
    const action = searchParams.get("action");
    const actorId = searchParams.get("actorId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    const query: Record<string, unknown> = {};
    if (orgId) query.organizationId = orgId;
    if (action) query.action = action;
    if (actorId) query.actorId = actorId;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return Response.json({
      success: true,
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Audit log fetch error:", error);
    return jsonError("Failed to fetch audit logs", 500);
  }
}
