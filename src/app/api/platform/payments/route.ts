import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Payment from "@/models/Payment";
import TeamMember from "@/models/TeamMember";
import Organization from "@/models/Organization";
import { requirePlatformOwner } from "@/lib/api-auth";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const query: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      query.status = status;
    }

    const payments = await Payment.find(query).sort({ createdAt: -1 }).lean();

    // Enrich with user and org names
    const userIds = [...new Set(payments.map((p) => p.userId).filter(Boolean))];
    const orgIds = [...new Set(payments.map((p) => p.organizationId).filter(Boolean))];

    const users = await TeamMember.find({ _id: { $in: userIds } }).select("_id name email").lean();
    const orgs = await Organization.find({ _id: { $in: orgIds } }).select("_id name").lean();

    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const orgMap = new Map(orgs.map((o) => [String(o._id), o]));

    const enrichedPayments = payments.map((p) => {
      const user = userMap.get(p.userId);
      const org = p.organizationId ? orgMap.get(p.organizationId) : null;
      return {
        ...p,
        userName: user ? user.name : "Unknown User",
        userEmail: user ? user.email : "",
        organizationName: org ? org.name : null,
      };
    });

    return Response.json({ success: true, payments: enrichedPayments });
  } catch (error) {
    console.error("Error fetching platform payments:", error);
    return jsonError("Failed to fetch payments", 500);
  }
}
