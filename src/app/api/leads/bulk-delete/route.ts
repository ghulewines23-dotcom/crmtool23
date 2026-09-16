import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import { requireRole } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, "FOUNDER", "ADMIN", "SERENE_OWNER");
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { success: false, error: "ids array required" },
        { status: 400 }
      );
    }

    console.log(`[BULK DELETE /api/leads] user=${auth.user.id} role=${auth.user.role} orgId=${auth.user.organizationId} requestCount=${ids.length}`);

    // SERENE_OWNER can delete across orgs, others scoped to their org
    const deleteQuery: Record<string, unknown> = {
      _id: { $in: ids },
    };
    if (auth.user.role !== "SERENE_OWNER") {
      deleteQuery.organizationId = auth.user.organizationId;
    }

    const result = await Lead.deleteMany(deleteQuery);
    console.log(`[BULK DELETE /api/leads] Deleted count=${result.deletedCount}`);

    return Response.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error("Bulk delete leads error:", error);
    return Response.json(
      { success: false, error: "Failed to delete leads" },
      { status: 500 }
    );
  }
}
