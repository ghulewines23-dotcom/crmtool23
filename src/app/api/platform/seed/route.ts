import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import TeamMember from "@/models/TeamMember";

/**
 * POST /api/platform/seed
 * Creates "Serene Agency" org + free subscription + assigns owner.
 */
export async function POST(_request: NextRequest) {
  try {
    await connectDB();

    // Find or create Serene Agency
    let org = await Organization.findOne({ name: "Serene Agency" }).lean();
    if (!org) {
      org = await Organization.create({
        name: "Serene Agency",
        industry: "Digital Marketing",
        phone: "",
        country: "India",
        status: "ACTIVE",
        founderId: "",
      });
    }

    const orgId = String((org as { _id: unknown })._id);

    // Create free subscription if not exists
    const existingSub = await Subscription.findOne({ organizationId: orgId }).lean();
    if (!existingSub) {
      await Subscription.create({
        organizationId: orgId,
        plan: "FREE_TRIAL",
        status: "TRIAL",
        price: 0,
        maxLeads: 999999,
        maxMembers: 50,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
    }

    // Assign owner to this org
    const owner = await TeamMember.findOne({ role: "SERENE_OWNER" });
    if (owner && (!owner.organizationId || owner.organizationId === "")) {
      await TeamMember.findByIdAndUpdate(owner._id, {
        organizationId: orgId,
        role: "SERENE_OWNER",
      });
    }

    return Response.json({
      success: true,
      organizationId: orgId,
      name: "Serene Agency",
      message: "Serene Agency ready",
    });
  } catch (error) {
    console.error("Seed error:", error);
    return Response.json({ success: false, error: "Seed failed" }, { status: 500 });
  }
}
