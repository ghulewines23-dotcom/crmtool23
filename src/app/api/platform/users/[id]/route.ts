import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import AuditLog from "@/models/AuditLog";
import { requirePlatformOwner } from "@/lib/api-auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformOwner(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    await connectDB();

    const body = await request.json();
    const {
      status,
      role,
      canAccessCRM,
      canCreateOrganization,
      canJoinOrganization,
    } = body;

    const user = await TeamMember.findById(id).lean();
    if (!user) {
      return Response.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const changes: string[] = [];

    if (status !== undefined && status !== user.status) {
      updates.status = status;
      changes.push(`status: ${user.status} → ${status}`);
    }

    if (role !== undefined && role !== user.role) {
      if (role === "SERENE_OWNER") {
        return Response.json({ success: false, error: "Cannot assign SERENE_OWNER role" }, { status: 400 });
      }
      updates.role = role;
      changes.push(`role: ${user.role} → ${role}`);
    }

    if (canAccessCRM !== undefined && canAccessCRM !== user.canAccessCRM) {
      updates.canAccessCRM = canAccessCRM;
      changes.push(`canAccessCRM: ${user.canAccessCRM} → ${canAccessCRM}`);
    }

    if (canCreateOrganization !== undefined && canCreateOrganization !== user.canCreateOrganization) {
      updates.canCreateOrganization = canCreateOrganization;
      changes.push(`canCreateOrganization: ${user.canCreateOrganization} → ${canCreateOrganization}`);
    }

    if (canJoinOrganization !== undefined && canJoinOrganization !== user.canJoinOrganization) {
      updates.canJoinOrganization = canJoinOrganization;
      changes.push(`canJoinOrganization: ${user.canJoinOrganization} → ${canJoinOrganization}`);
    }

    if (changes.length === 0) {
      return Response.json({ success: true, message: "No changes" });
    }

    await TeamMember.findByIdAndUpdate(id, { $set: updates });

    // Create audit log for each change
    for (const change of changes) {
      const [field] = change.split(":");
      let action = "USER_UPDATED";
      if (field === "status") {
        if (String(updates.status) === "active") action = "USER_APPROVED";
        else if (String(updates.status) === "suspended") action = "USER_SUSPENDED";
      } else if (field === "canAccessCRM") action = "CRM_ACCESS_CHANGED";
      else if (field === "canCreateOrganization") action = "CREATE_ORGANIZATION_ACCESS_CHANGED";
      else if (field === "canJoinOrganization") action = "JOIN_ORGANIZATION_ACCESS_CHANGED";
      else if (field === "role") action = "ROLE_CHANGED";

      await AuditLog.create({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action,
        targetType: "User",
        targetId: id,
        metadata: { change, userName: user.name, userEmail: user.email },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Platform user update error:", error);
    return Response.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}
