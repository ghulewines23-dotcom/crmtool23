import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import { requireFounder } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFounder(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Prevent FOUNDER from modifying themselves via this endpoint
    if (id === auth.user.id) {
      return jsonError(
        "You cannot modify your own account through team management",
        403
      );
    }

    // Prevent assigning SERENE_OWNER role
    if (body.role === "SERENE_OWNER") {
      return jsonError("Cannot assign SERENE_OWNER role through team management", 403);
    }

    // Validate role if being changed
    if (body.role && !["ADMIN", "SALES_PERSON"].includes(body.role)) {
      return jsonError("Invalid role. Must be ADMIN or SALES_PERSON", 400);
    }

    // Fetch current member state for audit logging
    const currentMember = await TeamMember.findOne({
      _id: id,
      organizationId: auth.user.organizationId, // tenant isolation
    }).lean();

    if (!currentMember) {
      return jsonError("Team member not found", 404);
    }

    const initials = body.name
      ? body.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : undefined;

    const member = await TeamMember.findOneAndUpdate(
      { _id: id, organizationId: auth.user.organizationId },
      {
        ...(body.name && { name: body.name }),
        ...(body.email && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.role && { role: body.role }),
        ...(body.status && ["active", "inactive", "pending_access"].includes(body.status) && { status: body.status }),
        ...(body.isSalesEligible !== undefined && { isSalesEligible: body.isSalesEligible }),
        ...(body.secondaryRole !== undefined && { secondaryRole: body.secondaryRole }),
        ...(initials && { avatar: initials }),
      },
      { new: true }
    ).lean();

    if (!member) {
      return jsonError("Team member not found", 404);
    }

    // Audit log for approval (pending_access -> active)
    if (
      body.status === "active" &&
      currentMember.status === "pending_access"
    ) {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        organizationId: auth.user.organizationId,
        action: AUDIT_ACTIONS.USER_APPROVED,
        targetType: "User",
        targetId: id,
        metadata: {
          previousStatus: currentMember.status,
          newStatus: body.status,
          targetEmail: currentMember.email,
        },
      });
    }

    // Audit log for role changes
    if (body.role && body.role !== currentMember.role) {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        organizationId: auth.user.organizationId,
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        targetType: "User",
        targetId: id,
        metadata: {
          previousRole: currentMember.role,
          newRole: body.role,
          targetEmail: currentMember.email,
        },
      });
    }

    // Audit log for status changes (approval already logged above)
    if (
      body.status &&
      body.status !== currentMember.status &&
      currentMember.status !== "pending_access"
    ) {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        organizationId: auth.user.organizationId,
        action: AUDIT_ACTIONS.MEMBER_STATUS_CHANGED,
        targetType: "User",
        targetId: id,
        metadata: {
          previousStatus: currentMember.status,
          newStatus: body.status,
          targetEmail: currentMember.email,
        },
      });
    }

    return Response.json({ success: true, member: { ...member, id: String(member._id) } });
  } catch (error) {
    console.error("Error updating team member:", error);
    return jsonError("Failed to update team member", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFounder(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;

    // Prevent self-deletion
    if (id === auth.user.id) {
      return jsonError("You cannot remove yourself from the organization", 403);
    }

    const member = await TeamMember.findOneAndDelete({
      _id: id,
      organizationId: auth.user.organizationId, // tenant isolation
      role: { $ne: "FOUNDER" }, // Extra safety: cannot delete another FOUNDER
    });

    if (!member) {
      return jsonError("Team member not found", 404);
    }

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      organizationId: auth.user.organizationId,
      action: AUDIT_ACTIONS.MEMBER_REMOVED,
      targetType: "User",
      targetId: id,
      metadata: { removedEmail: member.email, removedRole: member.role },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting team member:", error);
    return jsonError("Failed to delete team member", 500);
  }
}
