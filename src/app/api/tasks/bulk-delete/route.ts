import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Task from "@/models/Task";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
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

    const isOwner = ["FOUNDER", "SERENE_OWNER"].includes(auth.user.role);

    // Scope to the organization (SERENE_OWNER may act across orgs)
    const scopeQuery: Record<string, unknown> = { _id: { $in: ids } };
    if (auth.user.role !== "SERENE_OWNER") {
      scopeQuery.organizationId = auth.user.organizationId;
    }

    // Only the task's creator (or an org owner) may delete it
    if (!isOwner) {
      scopeQuery.createdBy = auth.user.id;
    }

    const result = await Task.deleteMany(scopeQuery);

    return Response.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error("Bulk delete tasks error:", error);
    return Response.json(
      { success: false, error: "Failed to delete tasks" },
      { status: 500 }
    );
  }
}
