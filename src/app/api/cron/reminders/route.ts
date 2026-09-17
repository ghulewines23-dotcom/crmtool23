import { NextRequest } from "next/server";
import { runReminderJob } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/reminders
 *
 * Sends task + follow-up reminders for every user (2 minutes before due).
 * Not registered in vercel.json: Vercel Hobby limits cron to once per day,
 * which is too coarse for 2-minute reminders, so this route is available for
 * external schedulers only. Reminders are delivered on the Hobby plan by the
 * authenticated /api/reminders/check endpoint, which the app polls every
 * minute while a user has it open.
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