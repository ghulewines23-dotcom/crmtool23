import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;

    const query: Record<string, unknown> = {
      _id: id,
      organizationId: auth.user.organizationId,
    };

    // SALES_PERSON can only view their own leads
    if (auth.user.role === "SALES_PERSON") {
      query.assignedTo = auth.user.id;
    }

    const lead = await Lead.findOne(query).lean();

    if (!lead) {
      return Response.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, lead: { ...lead, id: lead._id } }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return Response.json(
      { success: false, error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  // ADMIN can update status and basic fields
  if (auth.user.role === "ADMIN") {
    try {
      await connectDB();
      const { id } = await params;
      const body = await request.json();

      const allowedUpdate: Record<string, unknown> = {};
      if (body.status !== undefined) allowedUpdate.status = body.status;
      if (body.notes !== undefined) allowedUpdate.notes = body.notes;
      if (body.priority !== undefined) allowedUpdate.priority = body.priority;
      if (body.nextFollowup !== undefined) allowedUpdate.nextFollowup = body.nextFollowup;
      if (body.value !== undefined) allowedUpdate.value = body.value;
      allowedUpdate.lastActivity = new Date();

      const lead = await Lead.findOneAndUpdate(
        { _id: id, organizationId: auth.user.organizationId },
        allowedUpdate,
        { new: true }
      ).lean();

      if (!lead) {
        return Response.json(
          { success: false, error: "Lead not found" },
          { status: 404 }
        );
      }

      return Response.json({ success: true, lead: { ...lead, id: lead._id } });
    } catch (error) {
      console.error("Error updating lead:", error);
      return Response.json(
        { success: false, error: "Failed to update lead" },
        { status: 500 }
      );
    }
  }

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // For SALES_PERSON: only allow updating status of their assigned leads
    if (auth.user.role === "SALES_PERSON") {
      const lead = await Lead.findOne({
        _id: id,
        organizationId: auth.user.organizationId,
        assignedTo: auth.user.id,
      }).lean();

      if (!lead) {
        return Response.json(
          { success: false, error: "Lead not found or not assigned to you" },
          { status: 404 }
        );
      }

      // SALES_PERSON can only update: status, notes, nextFollowup
      const allowedUpdate: Record<string, unknown> = {};
      if (body.status !== undefined) allowedUpdate.status = body.status;
      if (body.notes !== undefined) allowedUpdate.notes = body.notes;
      if (body.nextFollowup !== undefined) allowedUpdate.nextFollowup = body.nextFollowup;
      allowedUpdate.lastActivity = new Date();

      const updated = await Lead.findByIdAndUpdate(id, allowedUpdate, { new: true }).lean();
      return Response.json({ success: true, lead: { ...updated, id: updated?._id } });
    }

    // FOUNDER: full update access (scoped to org)
    const lead = await Lead.findOneAndUpdate(
      { _id: id, organizationId: auth.user.organizationId },
      {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.company !== undefined && { company: body.company }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.sourceUrl !== undefined && { sourceUrl: body.sourceUrl }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.requirement !== undefined && { requirement: body.requirement }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
        ...(body.assignedToName !== undefined && { assignedToName: body.assignedToName }),
        ...(body.nextFollowup !== undefined && { nextFollowup: body.nextFollowup }),
        lastActivity: new Date(),
      },
      { new: true }
    ).lean();

    if (!lead) {
      return Response.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, lead: { ...lead, id: lead._id } });
  } catch (error) {
    console.error("Error updating lead:", error);
    return Response.json(
      { success: false, error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  // FOUNDER, ADMIN, and SERENE_OWNER can delete leads
  if (!["FOUNDER", "ADMIN", "SERENE_OWNER"].includes(auth.user.role)) {
    return Response.json(
      { success: false, error: "Only organization owners can delete leads" },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    const { id } = await params;

    console.log(`[DELETE /api/leads/${id}] user=${auth.user.id} role=${auth.user.role} orgId=${auth.user.organizationId}`);

    const deleteQuery: Record<string, unknown> = {
      _id: id,
    };
    if (auth.user.role !== "SERENE_OWNER") {
      deleteQuery.organizationId = auth.user.organizationId;
    }

    const lead = await Lead.findOneAndDelete(deleteQuery);

    if (!lead) {
      console.warn(`[DELETE /api/leads/${id}] Lead not found with query:`, deleteQuery);
      return Response.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    console.log(`[DELETE /api/leads/${id}] Successfully deleted lead:`, id);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return Response.json(
      { success: false, error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
