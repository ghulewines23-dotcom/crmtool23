import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import TeamMember from "@/models/TeamMember";
import { requireRole } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, "FOUNDER", "ADMIN");
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const { ids, assignedTo } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { success: false, error: "ids array required" },
        { status: 400 }
      );
    }

    let assignedToName = "";
    if (assignedTo) {
      const member = await TeamMember.findOne({
        _id: assignedTo,
        organizationId: auth.user.organizationId,
      }).lean();
      if (!member) {
        return Response.json(
          { success: false, error: "Team member not found" },
          { status: 404 }
        );
      }
      assignedToName = member.name;
    }

    const update = assignedTo
      ? { assignedTo, assignedToName }
      : { assignedTo: "", assignedToName: "" };

    const result = await Lead.updateMany(
      { _id: { $in: ids }, organizationId: auth.user.organizationId },
      update
    );

    return Response.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("Bulk assign leads error:", error);
    return Response.json(
      { success: false, error: "Failed to assign leads" },
      { status: 500 }
    );
  }
}
