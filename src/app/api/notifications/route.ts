import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/api-auth";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/notifications
 * Returns notifications for the authenticated user.
 * Query params: unreadOnly (boolean), limit (number)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const query: Record<string, unknown> = { userId: auth.user.id };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: auth.user.id, read: false }),
    ]);

    return Response.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: String(n._id),
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        organizationId: n.organizationId,
        invitationId: n.invitationId,
        read: n.read,
        actionUrl: n.actionUrl,
        createdAt: n.createdAt,
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return jsonError("Failed to fetch notifications", 500);
  }
}

/**
 * PUT /api/notifications
 * Mark notifications as read.
 *
 * Body: { notificationIds?: string[] } — mark specific notifications as read
 * Body: { markAll?: true } — mark all as read
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const body = await request.json();

    if (body.markAll === true) {
      await Notification.updateMany(
        { userId: auth.user.id, read: false },
        { read: true }
      );
      return Response.json({ success: true });
    }

    if (body.notificationIds && Array.isArray(body.notificationIds)) {
      await Notification.updateMany(
        {
          _id: { $in: body.notificationIds },
          userId: auth.user.id, // tenant isolation
        },
        { read: true }
      );
      return Response.json({ success: true });
    }

    return jsonError("Provide notificationIds array or markAll: true", 400);
  } catch (error) {
    console.error("Error updating notifications:", error);
    return jsonError("Failed to update notifications", 500);
  }
}
