import { NextRequest } from "next/server";
import { runReminderJob } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/reminders
 *
 * Sends task + follow-up reminders for every user (2 minutes before due).
 * Intended to be run every minute by an external scheduler (e.g. Vercel
 * Cron). While the app is open, /api/reminders/check covers the same work
 * per-user, so reminders still arrive even if this schedule is delayed.
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
    const { notified } = await runReminderJob();
    return Response.json({ success: true, sent: notified.length, notified });
  } catch (error) {
    console.error("Reminder cron error:", error);
    return Response.json({ success: false, error: "Reminder job failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}