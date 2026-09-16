import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import { requirePlatformOwner } from "@/lib/api-auth";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/platform/users
 * List all users across all organizations (SERENE_OWNER only).
 */
export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const orgId = searchParams.get("organizationId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (orgId) query.organizationId = orgId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await TeamMember.countDocuments(query);
    const users = await TeamMember.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return Response.json({
      success: true,
      users: users.map((u) => ({ ...u, id: String(u._id) })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Platform users list error:", error);
    return jsonError("Failed to fetch users", 500);
  }
}
