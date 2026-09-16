/**
 * plan-config.ts
 *
 * Client-safe plan configuration. No server-side imports.
 * This file can be safely imported in both client and server code.
 */

import type { SubscriptionPlan } from "@/lib/types";

export const PLAN_LIMITS: Record<
  SubscriptionPlan,
  { price: number; maxLeads: number; maxMembers: number; durationDays: number }
> = {
  FREE_TRIAL: { price: 0, maxLeads: 20, maxMembers: 1, durationDays: 7 },
  STARTER:    { price: 1000, maxLeads: 50, maxMembers: 3, durationDays: 30 },
  GROWTH:     { price: 3000, maxLeads: 200, maxMembers: 5, durationDays: 30 },
  PRO:        { price: 5000, maxLeads: 300, maxMembers: 10, durationDays: 30 },
};
