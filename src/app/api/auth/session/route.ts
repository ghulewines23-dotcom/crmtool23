import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return Response.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    await connectDB();

    // Always re-validate user from DB — never trust JWT payload for role/orgId
    const user = await TeamMember.findById(session.userId)
      .select("name email role avatar phone organizationId status activeSessionId")
      .lean();

    if (!user || user.status !== "active") {
      return Response.json(
        { success: false, error: "Account not found or inactive" },
        { status: 401 }
      );
    }

    // Single device enforcement: check if the session ID matches the active session.
    // If another device has logged in, this session is invalid.
    if (user.activeSessionId && user.activeSessionId !== session.sessionId) {
      return Response.json(
        { success: false, error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    // Fetch real organization and subscription from DB
    let organization = null;
    let subscription = null;

    if (user.organizationId && user.organizationId !== "__pending__") {
      const [org, sub] = await Promise.all([
        Organization.findById(user.organizationId)
          .select("name status industry phone country logo founderId")
          .lean(),
        Subscription.findOne({ organizationId: user.organizationId })
          .select("plan status maxLeads maxMembers trialEndsAt currentPeriodStart currentPeriodEnd price")
          .lean(),
      ]);
      organization = org;
      subscription = sub;
    }

    return Response.json({
      success: true,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar:
          user.avatar ||
          user.name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        phone: user.phone,
        organizationId: user.organizationId,
      },
      organization: organization
        ? {
            id: String((organization as { _id: unknown })._id),
            name: (organization as { name: string }).name,
            status: (organization as { status: string }).status,
            industry: (organization as { industry: string }).industry,
            phone: (organization as { phone: string }).phone,
            country: (organization as { country: string }).country,
            logo: (organization as { logo?: string }).logo || "",
            founderId: (organization as { founderId: string }).founderId,
          }
        : null,
      subscription: subscription
        ? {
            plan: (subscription as { plan: string }).plan,
            status: (subscription as { status: string }).status,
            price: (subscription as { price: number }).price,
            maxLeads: (subscription as { maxLeads: number }).maxLeads,
            maxMembers: (subscription as { maxMembers: number }).maxMembers,
            trialEndsAt: (subscription as { trialEndsAt: Date | null }).trialEndsAt,
            currentPeriodStart: (subscription as { currentPeriodStart: Date }).currentPeriodStart,
            currentPeriodEnd: (subscription as { currentPeriodEnd: Date }).currentPeriodEnd,
          }
        : null,
    });
  } catch (error) {
    console.error("Session fetch error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
