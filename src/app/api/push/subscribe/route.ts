import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { storePushSubscription, removePushSubscription, isPushConfigured } from "@/lib/push";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * POST /api/push/subscribe
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 * Stores the current user's Web Push subscription (upsert by endpoint so a
 * device that switches accounts re-binds to the newest user automatically).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null);
    if (!body?.subscription?.endpoint || !body?.subscription?.keys) {
      return jsonError("Invalid subscription", 400);
    }

    await storePushSubscription(
      auth.user.id,
      auth.user.organizationId || undefined,
      body.subscription,
      request.headers.get("user-agent") || undefined
    );

    return Response.json({ success: true, configured: isPushConfigured() });
  } catch (error) {
    console.error("Error storing push subscription:", error);
    return jsonError("Failed to save subscription", 500);
  }
}

/**
 * DELETE /api/push/subscribe
 * Body: { endpoint: string }
 * Removes the subscription for the current user.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null);
    if (!body?.endpoint) return jsonError("Missing endpoint", 400);
    await removePushSubscription(auth.user.id, body.endpoint);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    return jsonError("Failed to remove subscription", 500);
  }
}