import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import Subscription from "@/models/Subscription";
import { requireAuth } from "@/lib/api-auth";
import { assignLeadToSalesPerson } from "@/lib/lead-assignment";
import { PLAN_LIMITS } from "@/lib/auth-helpers";

function jsonError(message: string, status: number, details?: Record<string, unknown>) {
  return Response.json({ success: false, error: message, ...details }, { status });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (!auth.user.organizationId) {
    return jsonError("Organization not found for current user", 400);
  }

  try {
    await connectDB();
    const body = await request.json();
    const { rows } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return jsonError("Rows array required and must not be empty", 400);
    }

    const orgId = auth.user.organizationId;

    // Fetch subscription to check capacity
    const subscription = await Subscription.findOne({ organizationId: orgId });
    const maxLeads = subscription
      ? subscription.maxLeads
      : PLAN_LIMITS.FREE_TRIAL.maxLeads;

    const currentLeadCount = await Lead.countDocuments({ organizationId: orgId });

    // Pre-validate required fields for incoming rows to count valid import candidates
    const validRows: Array<{
      company: string;
      phone: string;
      requirement: string;
      email?: string;
      source?: string;
      sourceUrl?: string;
      location?: string;
      status?: string;
      notes?: string;
    }> = [];

    let invalidCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const company = (r.company || r["Business Name"] || r.businessName || "").trim();
      const phone = (r.phone || r["Phone Number"] || r.mobile || "").trim();
      const requirement = (
        r.requirement ||
        r.service ||
        r["Requirement"] ||
        r["Need"] ||
        r["Feedback"] ||
        r.feedback ||
        ""
      ).trim();

      if (!company || !phone || !requirement) {
        invalidCount++;
        errors.push(`Row ${i + 1}: Missing required field (company, phone, or requirement)`);
        continue;
      }

      validRows.push({
        company,
        phone,
        requirement,
        email: (r.email || r["Email"] || "").trim(),
        source: (r.source || r["Source"] || "Import").trim(),
        sourceUrl: (r.sourceUrl || r["Source Link"] || r.source_url || "").trim(),
        location: (r.location || r["City"] || r["Location"] || "").trim(),
        status: (r.status || "new").trim(),
        notes: (r.notes || "").trim(),
      });
    }

    if (validRows.length === 0) {
      return jsonError("No valid rows found in import file", 400, {
        invalidCount,
        errors,
      });
    }

    // CAPACITY CHECK: If current + incoming exceeds maxLeads, REJECT THE ENTIRE IMPORT BATCH!
    if (currentLeadCount + validRows.length > maxLeads) {
      const remainingCapacity = Math.max(0, maxLeads - currentLeadCount);
      return jsonError(
        `Import exceeds plan lead limit. Your current plan allows max ${maxLeads} leads (used: ${currentLeadCount}, remaining capacity: ${remainingCapacity}, import batch size: ${validRows.length}). Please upgrade your plan to import more leads.`,
        400,
        {
          currentLeadCount,
          maxLeads,
          remainingCapacity,
          batchSize: validRows.length,
        }
      );
    }

    // Check duplicates within organization (by phone or email or requirement+company)
    const existingLeads = await Lead.find({ organizationId: orgId })
      .select("phone email company requirement")
      .lean();

    const existingPhones = new Set(existingLeads.map((l) => l.phone).filter(Boolean));
    const existingEmails = new Set(existingLeads.map((l) => l.email).filter(Boolean));

    const toInsert: Array<Record<string, unknown>> = [];
    let duplicateCount = 0;

    for (const item of validRows) {
      if (
        (item.phone && existingPhones.has(item.phone)) ||
        (item.email && existingEmails.has(item.email))
      ) {
        duplicateCount++;
        continue;
      }

      // Run auto-assignment per lead
      const assigned = await assignLeadToSalesPerson(orgId);

      toInsert.push({
        requirement: item.requirement,
        company: item.company,
        phone: item.phone,
        email: item.email || "",
        source: item.source || "Import",
        sourceUrl: item.sourceUrl || "",
        location: item.location || "",
        status: item.status || "new",
        notes: item.notes || "",
        assignedTo: assigned ? assigned.id : "",
        assignedToName: assigned ? assigned.name : "",
        organizationId: orgId,
      });
    }

    if (toInsert.length === 0) {
      return Response.json({
        success: true,
        importedCount: 0,
        duplicateCount,
        invalidCount,
        errors,
        insertedIds: [],
        message: "All valid rows were duplicates",
      });
    }

    const inserted = await Lead.insertMany(toInsert);
    const insertedIds = inserted.map((doc) => String(doc._id));

    return Response.json({
      success: true,
      importedCount: inserted.length,
      duplicateCount,
      invalidCount,
      errors,
      insertedIds,
    });
  } catch (error) {
    console.error("Error importing leads:", error);
    return jsonError("Failed to import leads", 500);
  }
}
