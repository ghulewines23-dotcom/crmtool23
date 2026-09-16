import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Client from "@/models/Client";
import { requireRole } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, "FOUNDER", "ADMIN");
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

    const result = await Client.deleteMany({
      _id: { $in: ids },
      organizationId: auth.user.organizationId,
    });

    return Response.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error("Bulk delete clients error:", error);
    return Response.json(
      { success: false, error: "Failed to delete clients" },
      { status: 500 }
    );
  }
}
