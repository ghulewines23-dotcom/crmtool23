import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Task from "@/models/Task";
import { requireAuth } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;

    const task = await Task.findOne({
      _id: id,
      organizationId: auth.user.organizationId,
    }).lean();

    if (!task) {
      return Response.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return Response.json(
      { success: false, error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const existingTask = await Task.findOne({
      _id: id,
      organizationId: auth.user.organizationId,
    });

    if (!existingTask) {
      return Response.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const isOwner = ["FOUNDER", "SERENE_OWNER"].includes(auth.user.role);
    const isCreator = existingTask.createdBy === auth.user.id;

    if (!isOwner && !isCreator) {
      return Response.json(
        { success: false, error: "Only the creator of this task or owner can edit it" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.task !== undefined) updateData.title = body.task.trim();
    if (body.description !== undefined || body.notes !== undefined) updateData.description = body.notes || body.description || "";
    if (body.client !== undefined) updateData.client = body.client;
    if (body.project !== undefined) updateData.project = body.project;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.startDate !== undefined || body.strDate !== undefined) updateData.startDate = body.startDate || body.strDate || "";
    if (body.dueDate !== undefined || body.endDate !== undefined) updateData.dueDate = body.dueDate || body.endDate || "";
    if (isOwner && body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
    if (isOwner && body.assignedToName !== undefined) updateData.assignedToName = body.assignedToName;

    const task = await Task.findOneAndUpdate(
      { _id: id, organizationId: auth.user.organizationId },
      updateData,
      { new: true }
    ).lean();

    return Response.json({ success: true, task });
  } catch (error) {
    console.error("Error updating task:", error);
    return Response.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;

    const existingTask = await Task.findOne({
      _id: id,
      organizationId: auth.user.organizationId,
    });

    if (!existingTask) {
      return Response.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const isOwner = ["FOUNDER", "SERENE_OWNER"].includes(auth.user.role);
    const isCreator = existingTask.createdBy === auth.user.id;

    if (!isOwner && !isCreator) {
      return Response.json(
        { success: false, error: "Only the creator of this task or owner can delete it" },
        { status: 403 }
      );
    }

    await Task.deleteOne({ _id: id, organizationId: auth.user.organizationId });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return Response.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
