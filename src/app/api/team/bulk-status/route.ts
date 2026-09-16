import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import { requireRole } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, "FOUNDER");
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { success: false, error: "ids array required" },
        { status: 400 }
      );
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return Response.json(
        { success: false, error: "Valid status required (active/inactive)" },
        { status: 400 }
      );
    }

    const result = await TeamMember.updateMany(
      {
        _id: { $in: ids },
        organizationId: auth.user.organizationId,
        role: { $ne: "FOUNDER" },
      },
      { status }
    );

    return Response.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("Bulk status team error:", error);
    return Response.json(
      { success: false, error: "Failed to update team members" },
      { status: 500 }
    );
  }
}
