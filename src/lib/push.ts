import { connectDB } from "@/lib/db/connect";
import PushSubscriptionModel from "@/models/PushSubscription";

/**
 * Push notifications are optional. If VAPID keys are not configured the
 * helpers no-op gracefully and only in-app (bell) notifications are delivered.
 */
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@serenecrm.app";

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number }> {
  if (!isPushConfigured()) {
    return { sent: 0 };
  }

  let webpush: typeof import("web-push");
  try {
    webpush = (await import("web-push")).default;
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (error) {
    console.error("[push] web-push unavailable:", error);
    return { sent: 0 };
  }

  await connectDB();

  const subs = await PushSubscriptionModel.find({ userId }).lean();
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      const options = {
        TTL: 60 * 60 * 24,
        icon: payload.icon || "/icons/icon-192x192.png",
        badge: "/icons/icon-maskable-512x512.png",
        vibrate: [180, 90, 180],
        silent: false,
        renotify: true,
        data: { url: payload.url || "/", type: payload.tag || "general" },
      };

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            tag: payload.tag || `serene-${Date.now()}`,
            ...options,
          })
        );
        sent += 1;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        // Subscription expired / no longer valid — prune it.
        if (code === 404 || code === 410) {
          await PushSubscriptionModel.deleteOne({ _id: sub._id }).catch(() => {});
        } else {
          console.error(`[push] Failed sending to ${sub.endpoint}:`, err instanceof Error ? err.message : err);
        }
      }
    })
  );

  return { sent };
}

export async function storePushSubscription(
  userId: string,
  organizationId: string | undefined,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
): Promise<void> {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Invalid push subscription");
  }
  await connectDB();
  await PushSubscriptionModel.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      $set: {
        userId,
        organizationId: organizationId || null,
        keys: subscription.keys,
        userAgent: userAgent || "",
      },
    },
    { upsert: true, new: true }
  );
}

export async function removePushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  if (!endpoint) return;
  await connectDB();
  await PushSubscriptionModel.deleteOne({ userId, endpoint });
}