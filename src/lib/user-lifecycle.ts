import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";

/**
 * How long a rejected user is kept before being auto-deleted (in days).
 */
export const REJECTION_RETENTION_DAYS = 5;

/**
 * Returns the cutoff date — rejected users with a `rejectedAt` older than this
 * date are due for deletion.
 */
export function rejectionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - REJECTION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Deletes every rejected user whose rejection is older than the retention
 * window. Safe to call repeatedly; returns the number of removed users.
 *
 * This is the single source of truth for the auto-delete rule and is invoked
 * lazily whenever the platform owner loads the users list, plus from the
 * dedicated cron endpoint.
 */
export async function purgeExpiredRejectedUsers(now: Date = new Date()): Promise<number> {
  await connectDB();

  const result = await TeamMember.deleteMany({
    status: "rejected",
    rejectedAt: { $lte: rejectionCutoff(now) },
  });

  return result.deletedCount ?? 0;
}
