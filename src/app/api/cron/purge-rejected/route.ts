import { NextRequest } from "next/server";
import { purgeExpiredRejectedUsers, REJECTION_RETENTION_DAYS } from "@/lib/user-lifecycle";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/purge-rejected
 *
 * Deletes every rejected user whose 5-day retention window has elapsed.
 * Intended to be hit by an external scheduler (e.g. Vercel Cron). The same
 * purge also runs lazily whenever the platform owner loads the users list, so
 * a missed schedule never leaves stale accounts behind for long.
 *
 * Protect with CRON_SECRET when configured:
 *   Authorization: Bearer <CRON_SECRET>   (or ?secret=<CRON_SECRET>)
 */
async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const querySecret = new URL(request.url).searchParams.get("secret");
    const provided = auth?.startsWith("Bearer ") ? auth.slice(7) : querySecret;
    if (provided !== secret) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const deleted = await purgeExpiredRejectedUsers();
    return Response.json({
      success: true,
      deleted,
      retentionDays: REJECTION_RETENTION_DAYS,
    });
  } catch (error) {
    console.error("Purge rejected users error:", error);
    return Response.json({ success: false, error: "Purge failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
