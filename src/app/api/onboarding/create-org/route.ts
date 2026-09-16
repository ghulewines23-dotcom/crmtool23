import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const body = await request.json();
    const name = (body.name || "").trim();

    if (!name) {
      return Response.json({ success: false, error: "Organization name is required" }, { status: 400 });
    }

    const user = await TeamMember.findById(auth.user.id).lean();
    if (!user) {
      return Response.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (user.organizationId) {
      return Response.json({ success: false, error: "Organization already exists" }, { status: 400 });
    }

    const org = await Organization.create({
      name,
      founderId: String(user._id),
      industry: "",
      phone: "",
      status: "ACTIVE",
    });

    const orgId = String(org._id);

    await Subscription.create({
      organizationId: orgId,
      plan: "FREE_TRIAL",
      status: "TRIAL",
      price: 0,
      maxLeads: 999999,
      maxMembers: 5,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      trialEndsAt: null,
    });

    await TeamMember.findByIdAndUpdate(user._id, {
      $set: {
        organizationId: orgId,
        role: "FOUNDER",
        status: "active",
        canAccessCRM: true,
        canCreateOrganization: true,
      },
      $addToSet: {
        organizations: {
          organizationId: orgId,
          role: "FOUNDER",
          joinedAt: new Date(),
        },
      },
    });

    return Response.json({ success: true, organizationId: orgId });
  } catch (error) {
    console.error("Onboarding create org error:", error);
    return Response.json({ success: false, error: "Failed to create organization" }, { status: 500 });
  }
}
