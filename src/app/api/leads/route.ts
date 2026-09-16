import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import {
  requireAuth,
  checkLeadLimit,
  requireActiveSubscription,
} from "@/lib/api-auth";
import { assignLeadToSalesPerson } from "@/lib/lead-assignment";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoryParam = searchParams.get("category");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limitParam = searchParams.get("limit");
    
    // Support limit=all or limit=1000 (default to 1000 if not specified to avoid truncating org leads)
    let limit = 1000;
    if (limitParam === "all") {
      limit = 5000;
    } else if (limitParam) {
      const parsed = parseInt(limitParam);
      if (!isNaN(parsed) && parsed > 0) {
        limit = parsed;
      }
    }

    console.log(`[GET /api/leads] user=${auth.user.id} role=${auth.user.role} orgId="${auth.user.organizationId}" page=${page} limit=${limit}`);

    // Always scope by organizationId — multi-tenant isolation
    const query: Record<string, unknown> = {
      organizationId: auth.user.organizationId,
    };

    if (status && status !== "all") {
      query.status = status;
    }
    if (categoryParam && categoryParam !== "all") {
      query.category = categoryParam;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { requirement: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Lead.countDocuments(query);
    // Sort by createdAt desc, then _id desc as tie-breaker for deterministic ordering
    const leads = await Lead.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log(`[GET /api/leads] found ${leads.length} leads, total=${total}`);

    const serializedLeads = leads.map((l) => ({
      ...l,
      _id: String(l._id),
      id: String(l._id),
    }));

    return Response.json({
      success: true,
      leads: serializedLeads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return Response.json(
      { success: false, error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  // SERENE_OWNER and SALES_PERSON cannot create leads
  if (auth.user.role === "SERENE_OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  if (auth.user.role === "SALES_PERSON") {
    return Response.json(
      { success: false, error: "Sales persons cannot create leads directly" },
      { status: 403 }
    );
  }

  // Check subscription status
  const subCheck = await requireActiveSubscription(auth.user.organizationId);
  if (subCheck) return subCheck;

  // Check lead limit
  const limitCheck = await checkLeadLimit(auth.user.organizationId);
  if (!limitCheck.allowed) {
    return Response.json(
      { success: false, error: limitCheck.reason },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const body = await request.json();

    if (!body.requirement || !body.phone || !body.company) {
      return Response.json(
        { success: false, error: "requirement, phone, and company are required" },
        { status: 400 }
      );
    }

    let finalAssignedTo = body.assignedTo || "";
    let finalAssignedToName = body.assignedToName || "";

    if (!finalAssignedTo) {
      const autoAssigned = await assignLeadToSalesPerson(auth.user.organizationId);
      if (autoAssigned) {
        finalAssignedTo = autoAssigned.id;
        finalAssignedToName = autoAssigned.name;
      }
    }

    const lead = await Lead.create({
      name: body.name || "",
      phone: body.phone,
      email: body.email || "",
      company: body.company,
      category: body.category || "General",
      source: body.source || "",
      sourceUrl: body.sourceUrl || "",
      status: body.status || "new",
      requirement: body.requirement,
      notes: body.notes || "",
      interestedIn: body.interestedIn || "",
      website: body.website || "",
      location: body.location || "",
      value: body.value || 0,
      priority: body.priority || "medium",
      assignedTo: finalAssignedTo,
      assignedToName: finalAssignedToName,
      // Always use server-side organizationId — never trust frontend
      organizationId: auth.user.organizationId,
      createdBy: auth.user.id,
    });

    return Response.json(
      { success: true, lead: { ...lead.toObject(), id: lead._id } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating lead:", error);
    return Response.json(
      { success: false, error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
