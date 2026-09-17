import { connectDB } from "@/lib/db/connect";
import Task from "@/models/Task";
import Lead from "@/models/Lead";
import Notification from "@/models/Notification";
import { sendPushToUser } from "@/lib/push";

/**
 * Reminder engine — notifies users 2 minutes before a task ends or a
 * follow-up is due. Runs from a cron endpoint for everyone, and from the
 * authenticated /api/reminders/check endpoint while a user has the app open.
 */

const BEFORE_MS = 2 * 60 * 1000; // notify 2 minutes before
const CATCHUP_MS = 5 * 60 * 1000; // don't miss items whose reminder window passed while offline

export interface ReminderHit {
  id: string;
  kind: "task" | "followup";
  userId: string;
  type: "task_reminder" | "followup_reminder";
  title: string;
  message: string;
  url: string;
  tag: string;
  organizationId?: string | null;
}

export function parseDateTime(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function findDueReminders(opts?: { userId?: string; now?: Date }): Promise<ReminderHit[]> {
  await connectDB();
  const now = opts?.now || new Date();
  const windowStart = new Date(now.getTime() - CATCHUP_MS);
  const windowEnd = new Date(now.getTime() + BEFORE_MS);

  const hits: ReminderHit[] = [];

  // ── Tasks: due within the window, still open, never reminded ──
  const taskQuery: Record<string, unknown> = {
    assignedTo: { $ne: "" },
    status: { $ne: "completed" },
    reminderSentAt: null,
  };
  if (opts?.userId) taskQuery.assignedTo = opts.userId;

  const tasks = await Task.find(taskQuery)
    .select("_id title dueDate assignedTo assignedToName organizationId")
    .lean();

  for (const task of tasks as Array<Record<string, unknown>>) {
    const due = parseDateTime(task.dueDate as string | Date | undefined);
    if (!due) continue;
    if (due >= windowStart && due <= windowEnd) {
      const title = "Task due soon";
      const action = task.title ? `"${task.title}"` : "A task";
      hits.push({
        id: String(task._id),
        kind: "task",
        userId: String(task.assignedTo),
        type: "task_reminder",
        title,
        message: `${action} is due at ${due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
        url: "/tasks",
        tag: `task-${task._id}`,
        organizationId: (task.organizationId as string) || null,
      });
    }
  }

  // ── Lead follow-ups: due within the window, open status, never reminded ──
  const leadQuery: Record<string, unknown> = {
    assignedTo: { $ne: "" },
    status: { $nin: ["won", "lost"] },
    nextFollowup: { $ne: null, $gte: windowStart, $lte: windowEnd },
    followUpReminderSentAt: null,
  };
  if (opts?.userId) leadQuery.assignedTo = opts.userId;

  const leads = await Lead.find(leadQuery)
    .select("name company nextFollowup assignedTo assignedToName organizationId")
    .lean();

  for (const lead of leads as Array<Record<string, unknown>>) {
    const due = parseDateTime(lead.nextFollowup as Date | undefined);
    if (!due) continue;
    const client = lead.name ? lead.name + (lead.company ? ` (${lead.company})` : "") : "A lead";
    hits.push({
      id: String(lead._id),
      kind: "followup",
      userId: String(lead.assignedTo),
      type: "followup_reminder",
      title: "Follow-up due soon",
      message: `Follow up with ${client} at ${due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      url: "/leads",
      tag: `followup-${lead._id}`,
      organizationId: (lead.organizationId as string) || null,
    });
  }

  return hits;
}

/**
 * Persist an in-app notification for each hit, flag the source record so it
 * is never reminded twice, and fire a push notification to the assigned user.
 */
export async function runReminderJob(opts?: { userId?: string; now?: Date }): Promise<{
  notified: Array<{
    userId: string;
    id: string;
    type: string;
    title: string;
    message: string;
    url: string;
  }>;
}> {
  const hits = await findDueReminders(opts);
  const notified: Array<{
    userId: string;
    id: string;
    type: string;
    title: string;
    message: string;
    url: string;
  }> = [];

  for (const hit of hits) {
    const record = await Notification.create({
      userId: hit.userId,
      type: hit.type,
      title: hit.title,
      message: hit.message,
      organizationId: hit.organizationId || null,
      actionUrl: hit.url,
    }).catch(() => null);
    if (!record) continue;

    if (hit.kind === "task") {
      await Task.updateOne({ _id: hit.id }, { $set: { reminderSentAt: new Date() } }).catch(() => {});
    } else {
      await Lead.updateOne({ _id: hit.id }, { $set: { followUpReminderSentAt: new Date() } }).catch(() => {});
    }

    notified.push({
      userId: hit.userId,
      id: String(record._id),
      type: hit.type,
      title: hit.title,
      message: hit.message,
      url: hit.url,
    });

    // Fire the OS push (no-ops gracefully when VAPID keys are not configured).
    await sendPushToUser(hit.userId, {
      title: hit.title,
      body: hit.message,
      url: hit.url,
      tag: hit.tag,
    }).catch((err) => console.error("[reminders] push failed:", err?.message || err));
  }

  return { notified };
}