import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import { requireRole } from "@/lib/api-auth";

const VALID_STATUSES = ["new", "not_connected", "processing", "follow_up", "hot_lead", "won", "lost", "overdue"];

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, "FOUNDER", "ADMIN", "SALES_PERSON");
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

    if (!status || !VALID_STATUSES.includes(status)) {
      return Response.json(
        { success: false, error: "Valid status required" },
        { status: 400 }
      );
    }

    const result = await Lead.updateMany(
      { _id: { $in: ids }, organizationId: auth.user.organizationId },
      { status }
    );

    return Response.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("Bulk status update error:", error);
    return Response.json(
      { success: false, error: "Failed to update leads" },
      { status: 500 }
    );
  }
}
