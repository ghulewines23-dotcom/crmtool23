import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { runReminderJob } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * GET /api/reminders/check
 *
 * Run the reminder job for the authenticated user. Called by the app while
 * it is open (every ~60s) so reminders still ring + chime even if the server
 * cron isn't configured, and gives the page what to play/show locally.
 *
 * Returns the notifications that were just created for this user.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  // Owner panel has no tasks/follow-ups assigned to it.
  if (auth.user.role === "SERENE_OWNER") {
    return Response.json({ success: true, notified: [] });
  }

  try {
    const { notified } = await runReminderJob({ userId: auth.user.id });
    return Response.json({ success: true, notified });
  } catch (error) {
    console.error("Error running user reminder check:", error);
    return Response.json({ success: true, notified: [] });
  }
}