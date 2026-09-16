import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import JoinRequest from "@/models/JoinRequest";
import TeamMember from "@/models/TeamMember";
import AuditLog from "@/models/AuditLog";
import { requirePlatformOwner } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const total = await JoinRequest.countDocuments(query);
    const requests = await JoinRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return Response.json({
      success: true,
      requests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Join requests fetch error:", error);
    return Response.json({ success: false, error: "Failed to fetch join requests" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !["approve", "reject"].includes(action)) {
      return Response.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const joinRequest = await JoinRequest.findById(requestId).lean();
    if (!joinRequest) {
      return Response.json({ success: false, error: "Join request not found" }, { status: 404 });
    }

    if (joinRequest.status !== "pending") {
      return Response.json({ success: false, error: "Request already processed" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    await JoinRequest.findByIdAndUpdate(requestId, {
      $set: {
        status: newStatus,
        reviewedBy: auth.user.id,
        reviewedAt: new Date(),
      },
    });

    // If approved, add user to the organization
    if (action === "approve") {
      await TeamMember.findByIdAndUpdate(joinRequest.userId, {
        $set: {
          organizationId: joinRequest.organizationId,
          status: "active",
          canAccessCRM: true,
        },
        $addToSet: {
          organizations: {
            organizationId: joinRequest.organizationId,
            role: "SALES_PERSON",
            joinedAt: new Date(),
          },
        },
      });
    }

    await AuditLog.create({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: action === "approve" ? "JOIN_REQUEST_APPROVED" : "JOIN_REQUEST_REJECTED",
      targetType: "JoinRequest",
      targetId: requestId,
      metadata: {
        userName: joinRequest.userName,
        userEmail: joinRequest.userEmail,
        organizationId: joinRequest.organizationId,
        organizationName: joinRequest.organizationName,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Join request action error:", error);
    return Response.json({ success: false, error: "Failed to process request" }, { status: 500 });
  }
}
