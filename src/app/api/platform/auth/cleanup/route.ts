import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import Subscription from "@/models/Subscription";
import JoinToken from "@/models/JoinToken";

/**
 * POST /api/platform/auth/cleanup
 * Full cleanup — removes all non-owner data. Testing only.
 */
export async function POST(_request: NextRequest) {
  try {
    await connectDB();

    const [users, orgs, subs, tokens] = await Promise.all([
      TeamMember.deleteMany({ role: { $ne: "SERENE_OWNER" } }),
      Organization.deleteMany({}),
      Subscription.deleteMany({}),
      JoinToken.deleteMany({}),
    ]);

    // Reset owner org fields
    await TeamMember.updateMany(
      { role: "SERENE_OWNER" },
      { $set: { organizationId: "", organizations: [] } }
    );

    return Response.json({
      success: true,
      deleted: {
        users: users.deletedCount,
        organizations: orgs.deletedCount,
        subscriptions: subs.deletedCount,
        joinTokens: tokens.deletedCount,
      },
    });
  } catch (error) {
    console.error("Full cleanup error:", error);
    return Response.json({ success: false, error: "Cleanup failed" }, { status: 500 });
  }
}
