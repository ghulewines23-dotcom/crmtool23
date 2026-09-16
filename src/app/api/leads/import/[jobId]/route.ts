import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import TeamMember from "@/models/TeamMember";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { jobId } = await params;

  return Response.json({
    success: true,
    job: { id: jobId, status: "preview" },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { jobId } = await params;

  console.log(`[IMPORT CONFIRM] === START === Job: ${jobId}`);

  try {
    const body = await request.json();
    const rows: Array<{
      name: string;
      phone: string;
      email: string;
      company: string;
      source: string;
      sourceUrl: string;
      requirement: string;
      location: string;
      notes: string;
    }> = body.rows;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.error(`[IMPORT CONFIRM] No rows provided`);
      return Response.json(
        { success: false, error: "No valid rows to import" },
        { status: 400 }
      );
    }

    console.log(`[IMPORT CONFIRM] Received ${rows.length} rows to import`);

    await connectDB();
    console.log(`[IMPORT CONFIRM] DB connected`);

    // SERENE_OWNER must pass organizationId in body
    let organizationId = auth.user.organizationId;
    if (auth.user.role === "SERENE_OWNER") {
      organizationId = body.organizationId || organizationId;
    }

    if (!organizationId) {
      console.error(`[IMPORT CONFIRM] No organizationId! user=${auth.user.id} role=${auth.user.role} orgField=${auth.user.organizationId}`);
      return Response.json(
        { success: false, error: "No organization associated with your account" },
        { status: 400 }
      );
    }

    const createdBy = auth.user.id;

    console.log(`[IMPORT CONFIRM] organizationId=${organizationId} createdBy=${createdBy}`);

    // Count before
    const countBefore = await Lead.countDocuments({ organizationId });
    console.log(`[IMPORT CONFIRM] Lead count BEFORE insert: ${countBefore}`);

    // Fetch active sales agents for equal round-robin distribution
    let salesAgents = await TeamMember.find({
      organizationId,
      status: "active",
      $or: [
        { role: "SALES_PERSON" },
        { isSalesEligible: true },
        { secondaryRole: "SALES_PERSON" },
      ],
    })
      .select("_id name")
      .lean();

    // Fallback: If no explicit sales agents found, include active ADMINs
    if (salesAgents.length === 0) {
      salesAgents = await TeamMember.find({
        organizationId,
        status: "active",
        role: { $in: ["SALES_PERSON", "ADMIN"] },
      })
        .select("_id name")
        .lean();
    }

    console.log(`[IMPORT CONFIRM] Active sales agents for equal distribution: ${salesAgents.length}`);

    // Pre-insert safety check: filter out duplicates within batch & against database
    const incomingPhones = rows.map((r) => (r.phone || "").trim()).filter(Boolean);
    const incomingEmails = rows.map((r) => (r.email || "").trim().toLowerCase()).filter(Boolean);

    const existingPhonesList = incomingPhones.length > 0
      ? await Lead.find({ organizationId, phone: { $in: incomingPhones } }).select("phone").lean()
      : [];
    const existingEmailsList = incomingEmails.length > 0
      ? await Lead.find({ organizationId, email: { $in: incomingEmails } }).select("email").lean()
      : [];

    const existingPhones = new Set(existingPhonesList.map((l) => l.phone));
    const existingEmails = new Set(existingEmailsList.map((l) => l.email));

    const seenPhonesInBatch = new Set<string>();
    const seenEmailsInBatch = new Set<string>();

    const uniqueRows = rows.filter((row) => {
      const phone = (row.phone || "").trim();
      const email = (row.email || "").trim().toLowerCase();

      if (phone) {
        if (existingPhones.has(phone) || seenPhonesInBatch.has(phone)) return false;
        seenPhonesInBatch.add(phone);
      }
      if (email) {
        if (existingEmails.has(email) || seenEmailsInBatch.has(email)) return false;
        seenEmailsInBatch.add(email);
      }
      return true;
    });

    console.log(`[IMPORT CONFIRM] Deduplicated rows: ${uniqueRows.length} unique out of ${rows.length} received`);

    const documents = uniqueRows.map((row, index) => {
      let assignedTo = "";
      let assignedToName = "";

      if (salesAgents.length > 0) {
        // Round-robin: lead 0 → agent 0, lead 1 → agent 1, lead 2 → agent 0, etc.
        const agent = salesAgents[index % salesAgents.length];
        assignedTo = String(agent._id);
        assignedToName = agent.name;
      }

      return {
        name: row.name || "",
        phone: row.phone || "",
        email: row.email || "",
        company: row.company || "Unknown",
        source: row.source || "",
        sourceUrl: row.sourceUrl || "",
        requirement: (row.requirement || "").trim() || (row.name || "").trim() || (row.company || "").trim() || "Imported Lead",
        notes: row.notes || "",
        location: row.location || "",
        status: "not_connected" as const,
        priority: "medium" as const,
        assignedTo,
        assignedToName,
        organizationId,
        createdBy,
        rawExcelData: (row as any).rawExcelData || row,
      };
    });

    console.log(`[IMPORT CONFIRM] Prepared ${documents.length} documents`);
    if (documents.length > 0) {
      console.log(`[IMPORT CONFIRM] Sample doc:`, JSON.stringify(documents[0]));
    }

    // Use ordered:false so partial failures don't block successful inserts
    let insertedDocs: any[] = [];
    try {
      insertedDocs = await Lead.insertMany(documents, { ordered: false });
      console.log(`[IMPORT CONFIRM] insertMany returned ${insertedDocs.length} docs (isArray: ${Array.isArray(insertedDocs)})`);
    } catch (bulkError: any) {
      // Mongoose BulkWriteError — some docs may have been inserted
      console.error(`[IMPORT CONFIRM] insertMany threw:`, bulkError.message);
      if (bulkError.insertedDocs && bulkError.insertedDocs.length > 0) {
        insertedDocs = bulkError.insertedDocs;
        console.log(`[IMPORT CONFIRM] Partial success: ${insertedDocs.length} docs inserted before error`);
      } else {
        // Try one-by-one fallback
        console.log(`[IMPORT CONFIRM] Bulk insert failed, falling back to one-by-one`);
        for (let i = 0; i < documents.length; i++) {
          try {
            const doc = await Lead.create(documents[i]);
            insertedDocs.push(doc);
          } catch (oneError: any) {
            console.error(`[IMPORT CONFIRM] Row ${i} failed:`, oneError.message);
          }
        }
        console.log(`[IMPORT CONFIRM] One-by-one inserted: ${insertedDocs.length}/${documents.length}`);
      }
    }

    // Count after
    const countAfter = await Lead.countDocuments({ organizationId });
    console.log(`[IMPORT CONFIRM] Lead count AFTER insert: ${countAfter}`);
    console.log(`[IMPORT CONFIRM] Actual persisted delta: ${countAfter - countBefore}`);

    const importedCount = countAfter - countBefore;
    const insertedIds = insertedDocs.map((d: any) => String(d._id));
    const insertedLeads = insertedDocs.map((d: any) => ({
      ...((typeof d.toObject === "function" ? d.toObject() : d) as Record<string, unknown>),
      id: String((d as any)._id),
    }));

    console.log(`[IMPORT CONFIRM] Inserted IDs:`, insertedIds);
    console.log(`[IMPORT CONFIRM] === DONE === imported: ${importedCount}`);

    return Response.json({
      success: true,
      imported: importedCount,
      insertedIds,
      insertedLeads,
      duplicates: 0,
      invalid: 0,
      errors: [],
    });
  } catch (error: any) {
    console.error(`[IMPORT CONFIRM] FATAL ERROR:`, error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
        imported: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 }
    );
  }
}
