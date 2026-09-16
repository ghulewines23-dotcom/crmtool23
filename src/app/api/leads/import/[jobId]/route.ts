import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import TeamMember from "@/models/TeamMember";

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

    const organizationId = auth.user.organizationId;
    const createdBy = auth.user.id;

    // Count before
    const countBefore = await Lead.countDocuments({ organizationId });
    console.log(`[IMPORT CONFIRM] Lead count BEFORE insert: ${countBefore}`);

    // Fetch active sales agents for round-robin
    const salesAgents = await TeamMember.find({
      organizationId,
      role: { $in: ["sales_agent", "manager"] },
      status: "active",
    })
      .select("_id name")
      .lean();

    console.log(`[IMPORT CONFIRM] Active sales agents: ${salesAgents.length}`);

    const documents = rows.map((row, index) => {
      let assignedTo = "";
      let assignedToName = "";

      if (salesAgents.length > 0) {
        const agent = salesAgents[index % salesAgents.length];
        assignedTo = String(agent._id);
        assignedToName = agent.name;
      }

      return {
        name: row.name || "",
        phone: row.phone,
        email: row.email || "",
        company: row.company,
        source: row.source || "",
        sourceUrl: row.sourceUrl || "",
        requirement: row.requirement,
        notes: row.notes || "",
        location: row.location || "",
        status: "new" as const,
        priority: "medium" as const,
        assignedTo,
        assignedToName,
        organizationId,
        createdBy,
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

    console.log(`[IMPORT CONFIRM] Inserted IDs:`, insertedIds);
    console.log(`[IMPORT CONFIRM] === DONE === imported: ${importedCount}`);

    return Response.json({
      success: true,
      imported: importedCount,
      insertedIds,
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
