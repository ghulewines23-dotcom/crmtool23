import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Payment from "@/models/Payment";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import TeamMember from "@/models/TeamMember";
import { requirePlatformOwner } from "@/lib/api-auth";
import { PLAN_LIMITS, logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { orgName, founderId, plan, startDate, endDate } = body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return jsonError("Payment record not found", 404);
    }

    if (payment.status !== "APPROVED") {
      return jsonError("Payment must be APPROVED before creating an organization", 400);
    }

    const targetFounderId = founderId || payment.userId;
    const founder = await TeamMember.findById(targetFounderId);
    if (!founder) {
      return jsonError("Target Founder user not found", 404);
    }

    const selectedPlan = plan || payment.plan || "STARTER";
    const limits = PLAN_LIMITS[selectedPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.STARTER;

    const periodStart = startDate ? new Date(startDate) : new Date();
    const periodEnd = endDate
      ? new Date(endDate)
      : new Date(periodStart.getTime() + limits.durationDays * 24 * 60 * 60 * 1000);

    let org;
    let sub;

    // Check if Founder already has an organization (e.g. TRIAL org created during signup)
    if (founder.organizationId) {
      org = await Organization.findById(founder.organizationId);
    }

    if (!org) {
      org = await Organization.findOne({ founderId: String(founder._id) });
    }

    if (org) {
      // Transition existing Org & Subscription to ACTIVE with new plan limits
      org.status = "ACTIVE";
      if (orgName) org.name = orgName;
      await org.save();

      sub = await Subscription.findOne({ organizationId: String(org._id) });
      if (sub) {
        sub.plan = selectedPlan;
        sub.status = "ACTIVE";
        sub.price = limits.price;
        sub.maxLeads = limits.maxLeads;
        sub.maxMembers = limits.maxMembers;
        sub.currentPeriodStart = periodStart;
        sub.currentPeriodEnd = periodEnd;
        await sub.save();
      } else {
        sub = await Subscription.create({
          organizationId: String(org._id),
          plan: selectedPlan,
          status: "ACTIVE",
          price: limits.price,
          maxLeads: limits.maxLeads,
          maxMembers: limits.maxMembers,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        });
      }
    } else {
      // Create new Organization + Subscription atomically
      org = await Organization.create({
        name: orgName || `${founder.name}'s Organization`,
        founderId: String(founder._id),
        status: "ACTIVE",
      });

      const orgId = String(org._id);

      sub = await Subscription.create({
        organizationId: orgId,
        plan: selectedPlan,
        status: "ACTIVE",
        price: limits.price,
        maxLeads: limits.maxLeads,
        maxMembers: limits.maxMembers,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      });

      // Update Founder user's organizationId
      founder.organizationId = orgId;
      await founder.save();
    }

    // Link payment to organization
    payment.organizationId = String(org._id);
    await payment.save();

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      organizationId: String(org._id),
      action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
      targetType: "Organization",
      targetId: String(org._id),
      metadata: { plan: selectedPlan, paymentId: String(payment._id), founderId: String(founder._id) },
    });

    return Response.json({
      success: true,
      organization: {
        id: String(org._id),
        name: org.name,
        status: org.status,
      },
      subscription: {
        id: String(sub._id),
        plan: sub.plan,
        status: sub.status,
        maxLeads: sub.maxLeads,
        maxMembers: sub.maxMembers,
      },
      payment,
    });
  } catch (error) {
    console.error("Error creating organization from payment:", error);
    return jsonError("Failed to create organization from payment", 500);
  }
}
