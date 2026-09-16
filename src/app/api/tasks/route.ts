import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Task from "@/models/Task";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");

    const filter: Record<string, string> = {
      organizationId: auth.user.organizationId,
    };
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();

    return Response.json({ success: true, tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return Response.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const body = await request.json();

    if (!body.title?.trim()) {
      return Response.json(
        { success: false, error: "Task title is required" },
        { status: 400 }
      );
    }

    const assignedTo = body.assignedTo || auth.user.id;
    const assignedToName = body.assignedToName || auth.user.name;

    const task = await Task.create({
      title: body.title ? body.title.trim() : (body.task ? body.task.trim() : "Untitled Task"),
      description: body.notes || body.description || "",
      client: body.client || "",
      project: body.project || "",
      status: body.status || "todo",
      priority: body.priority || "medium",
      startDate: body.startDate || body.strDate || "",
      dueDate: body.dueDate || body.endDate || "",
      assignedTo,
      assignedToName,
      organizationId: auth.user.organizationId,
      createdBy: auth.user.id,
      createdByName: auth.user.name,
      createdByRole: auth.user.role,
    });

    return Response.json({ success: true, task }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return Response.json(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    );
  }
}
