import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import { requireAuth, requireFounder } from "@/lib/api-auth";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

/**
 * GET /api/organization
 * Returns the authenticated user's organization + subscription.
 * All customer roles can access this.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!auth.user.organizationId) {
    return jsonError("No organization associated with this account", 404);
  }

  try {
    await connectDB();

    const [org, sub] = await Promise.all([
      Organization.findById(auth.user.organizationId).lean(),
      Subscription.findOne({ organizationId: auth.user.organizationId }).lean(),
    ]);

    if (!org) {
      return jsonError("Organization not found", 404);
    }

    return Response.json({
      success: true,
      organization: {
        id: String((org as { _id: unknown })._id),
        name: (org as { name: string }).name,
        status: (org as { status: string }).status,
        industry: (org as { industry: string }).industry,
        phone: (org as { phone: string }).phone,
        country: (org as { country: string }).country,
        logo: (org as { logo?: string }).logo || "",
        founderId: (org as { founderId: string }).founderId,
        createdAt: (org as { createdAt: Date }).createdAt,
      },
      subscription: sub
        ? {
            plan: (sub as { plan: string }).plan,
            status: (sub as { status: string }).status,
            price: (sub as { price: number }).price,
            maxLeads: (sub as { maxLeads: number }).maxLeads,
            maxMembers: (sub as { maxMembers: number }).maxMembers,
            trialEndsAt: (sub as { trialEndsAt: Date | null }).trialEndsAt,
            currentPeriodStart: (sub as { currentPeriodStart: Date }).currentPeriodStart,
            currentPeriodEnd: (sub as { currentPeriodEnd: Date }).currentPeriodEnd,
          }
        : null,
    });
  } catch (error) {
    console.error("Organization fetch error:", error);
    return jsonError("Failed to fetch organization", 500);
  }
}

/**
 * PUT /api/organization
 * Update organization settings (FOUNDER only).
 */
export async function PUT(request: NextRequest) {
  const auth = await requireFounder(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const body = await request.json();
    const allowedFields: Record<string, unknown> = {};

    if (body.name !== undefined) allowedFields.name = String(body.name).trim();
    if (body.industry !== undefined) allowedFields.industry = String(body.industry).trim();
    if (body.phone !== undefined) allowedFields.phone = String(body.phone).trim();
    if (body.country !== undefined) allowedFields.country = String(body.country).trim();
    if (body.logo !== undefined) allowedFields.logo = String(body.logo).trim();

    const org = await Organization.findByIdAndUpdate(
      auth.user.organizationId,
      allowedFields,
      { new: true }
    ).lean();

    if (!org) {
      return jsonError("Organization not found", 404);
    }

    return Response.json({
      success: true,
      organization: {
        id: String((org as { _id: unknown })._id),
        name: (org as { name: string }).name,
        status: (org as { status: string }).status,
        industry: (org as { industry: string }).industry,
        phone: (org as { phone: string }).phone,
        country: (org as { country: string }).country,
        logo: (org as { logo?: string }).logo || "",
      },
    });
  } catch (error) {
    console.error("Organization update error:", error);
    return jsonError("Failed to update organization", 500);
  }
}
