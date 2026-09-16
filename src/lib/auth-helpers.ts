/**
 * auth-helpers.ts
 *
 * Server-side helpers for creating organizations, subscriptions,
 * and writing audit log entries. Used in API routes only.
 */

import { connectDB } from "@/lib/db/connect";
import Organization from "@/models/Organization";
import Subscription, { type SubscriptionPlan } from "@/models/Subscription";
import AuditLog from "@/models/AuditLog";

// Re-export PLAN_LIMITS from client-safe module
import { PLAN_LIMITS } from "@/lib/plan-config";
export { PLAN_LIMITS };

// ─── Organization + Subscription creation ───────────────────────────────────

export interface CreateOrgParams {
  name: string;
  founderId: string;
  industry?: string;
  phone?: string;
  country?: string;
}

export async function createOrgWithTrial(params: CreateOrgParams): Promise<{
  organization: { id: string; name: string; status: string };
  subscription: { id: string; plan: string; status: string; trialEndsAt: Date };
}> {
  await connectDB();

  const now = new Date();
  const trialEndsAt = new Date(
    now.getTime() + PLAN_LIMITS.FREE_TRIAL.durationDays * 24 * 60 * 60 * 1000
  );

  const org = await Organization.create({
    name: params.name,
    founderId: params.founderId,
    industry: params.industry || "",
    phone: params.phone || "",
    country: params.country || "India",
    status: "TRIAL",
  });

  const orgId = String(org._id);

  const sub = await Subscription.create({
    organizationId: orgId,
    plan: "FREE_TRIAL",
    status: "TRIAL",
    price: 0,
    maxLeads: PLAN_LIMITS.FREE_TRIAL.maxLeads,
    maxMembers: PLAN_LIMITS.FREE_TRIAL.maxMembers,
    currentPeriodStart: now,
    currentPeriodEnd: trialEndsAt,
    trialEndsAt,
  });

  return {
    organization: {
      id: orgId,
      name: org.name,
      status: org.status,
    },
    subscription: {
      id: String(sub._id),
      plan: sub.plan,
      status: sub.status,
      trialEndsAt,
    },
  };
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export interface LogAuditParams {
  actorId: string;
  actorEmail: string;
  organizationId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      organizationId: params.organizationId ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}

// ─── Audit action constants ───────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  USER_SIGNUP: "USER_SIGNUP",
  USER_APPROVED: "USER_APPROVED",
  USER_REJECTED: "USER_REJECTED",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGIN_FAILED: "USER_LOGIN_FAILED",
  USER_LOGOUT: "USER_LOGOUT",
  LOGIN_NEW_DEVICE: "LOGIN_NEW_DEVICE",
  OTP_REQUESTED: "OTP_REQUESTED",
  OTP_VERIFIED: "OTP_VERIFIED",
  OTP_FAILED: "OTP_FAILED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  ORGANIZATION_CREATED: "ORGANIZATION_CREATED",
  MEMBER_JOINED: "MEMBER_JOINED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  ROLE_CHANGED: "ROLE_CHANGED",
  MEMBER_STATUS_CHANGED: "MEMBER_STATUS_CHANGED",
  SUBSCRIPTION_CHANGED: "SUBSCRIPTION_CHANGED",
  PAYMENT_APPROVED: "PAYMENT_APPROVED",
  PAYMENT_REJECTED: "PAYMENT_REJECTED",
  ORG_SUSPENDED: "ORG_SUSPENDED",
  ORG_ACTIVATED: "ORG_ACTIVATED",
  ORGANIZATION_SWITCHED: "ORGANIZATION_SWITCHED",
  JOIN_TOKEN_CREATED: "JOIN_TOKEN_CREATED",
  JOIN_TOKEN_REVOKED: "JOIN_TOKEN_REVOKED",
} as const;
