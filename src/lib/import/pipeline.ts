import { parseFile } from "./file-parser";
import { mapColumns, mapRowToCanonical } from "./column-mapper";
import { normalizeLead } from "./normalizer";
import { validateLeads } from "./validator";
import { checkDuplicatesBatch } from "./duplicate-checker";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import TeamMember from "@/models/TeamMember";

export interface ImportJob {
  id: string;
  fileName: string;
  status: "parsing" | "preview" | "importing" | "completed" | "failed";
  totalRows: number;
  validLeads: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  errors: string[];
  warnings: string[];
  preview?: PreviewRow[];
  mapping?: Record<string, string>;
  unmappedHeaders?: string[];
  detectedHeaderRow?: number;
  createdAt: Date;
}

export interface PreviewRow {
  index: number;
  name: string;
  phone: string;
  email: string;
  company: string;
  source: string;
  sourceUrl: string;
  requirement: string;
  location: string;
  notes: string;
  originalData: Record<string, string>;
  isDuplicate: boolean;
  duplicateType?: "phone" | "email";
  isValid: boolean;
  errors: string[];
}

// In-memory store for import jobs
const importJobs = new Map<string, ImportJob>();

export function getImportJob(id: string): ImportJob | undefined {
  return importJobs.get(id);
}

function generateJobId(): string {
  return "imp_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export async function parseAndAnalyzeFile(
  buffer: Buffer,
  fileName: string,
  organizationId: string
): Promise<ImportJob> {
  const jobId = generateJobId();

  // Step 1: Parse file with auto header detection
  let parseResult;
  try {
    parseResult = parseFile(buffer, fileName);
  } catch (error) {
    const job: ImportJob = {
      id: jobId,
      fileName,
      status: "failed",
      totalRows: 0,
      validLeads: 0,
      invalidRows: 0,
      duplicateRows: 0,
      importedRows: 0,
      errors: [error instanceof Error ? error.message : "Failed to parse file"],
      warnings: [],
      createdAt: new Date(),
    };
    importJobs.set(jobId, job);
    return job;
  }

  if (parseResult.rows.length === 0) {
    const job: ImportJob = {
      id: jobId,
      fileName,
      status: "failed",
      totalRows: 0,
      validLeads: 0,
      invalidRows: 0,
      duplicateRows: 0,
      importedRows: 0,
      errors: ["No data rows found in the file"],
      warnings: [],
      createdAt: new Date(),
    };
    importJobs.set(jobId, job);
    return job;
  }

  // Step 2: Map columns
  const { mapping, unmappedHeaders } = mapColumns(parseResult.headers);

  // Step 3: Map all rows to canonical format + normalize
  const canonicalRows = parseResult.rows.map((row) => {
    const mapped = mapRowToCanonical(row, mapping);
    return normalizeLead(mapped);
  });

  // Step 4: Validate
  const { valid, invalid, warnings } = validateLeads(canonicalRows);

  // Step 5: Check duplicates (only among valid leads)
  const duplicateResults = await checkDuplicatesBatch(valid, organizationId);

  // Step 6: Build preview
  const preview: PreviewRow[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  // Add valid rows to preview
  valid.forEach((lead, i) => {
    const dupResult = duplicateResults.get(i);
    const isDuplicate = dupResult?.isDuplicate || false;
    if (isDuplicate) duplicateCount++;
    else validCount++;

    preview.push({
      index: i,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      source: lead.source,
      sourceUrl: lead.sourceUrl,
      requirement: lead.requirement,
      location: lead.location,
      notes: lead.notes,
      originalData: lead.originalData,
      isDuplicate,
      duplicateType: dupResult?.duplicateType ?? undefined,
      isValid: true,
      errors: [],
    });
  });

  // Add invalid rows to preview
  invalid.forEach(({ lead, index, errors }) => {
    invalidCount++;
    preview.push({
      index,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      source: lead.source,
      sourceUrl: lead.sourceUrl,
      requirement: lead.requirement,
      location: lead.location,
      notes: lead.notes,
      originalData: lead.originalData,
      isDuplicate: false,
      isValid: false,
      errors: errors.map((e) => e.message),
    });
  });

  const totalErrors = invalid.reduce<string[]>((acc, { errors }) => {
    return acc.concat(errors.map((e) => e.message));
  }, []);

  const totalWarnings = warnings.reduce<string[]>((acc, { warnings: w }) => {
    return acc.concat(w.map((wr) => wr.message));
  }, []);

  const job: ImportJob = {
    id: jobId,
    fileName,
    status: "preview",
    totalRows: parseResult.totalRows,
    validLeads: validCount,
    invalidRows: invalidCount,
    duplicateRows: duplicateCount,
    importedRows: 0,
    errors: totalErrors,
    warnings: totalWarnings,
    preview: preview.sort((a, b) => a.index - b.index),
    mapping,
    unmappedHeaders,
    detectedHeaderRow: parseResult.headerRowIndex,
    createdAt: new Date(),
  };

  importJobs.set(jobId, job);
  return job;
}

export async function importValidLeads(
  jobId: string,
  organizationId: string,
  createdBy: string
): Promise<ImportJob> {
  const job = importJobs.get(jobId);
  if (!job) throw new Error("Import job not found");
  if (job.status !== "preview") throw new Error("Import job is not in preview state");

  job.status = "importing";
  importJobs.set(jobId, job);

  console.log(`[IMPORT] Starting import for job ${jobId}, org ${organizationId}`);

  try {
    await connectDB();
    console.log(`[IMPORT] DB connected`);

    const leadsToImport = (job.preview || []).filter(
      (row) => row.isValid && !row.isDuplicate
    );

    console.log(`[IMPORT] Total preview rows: ${(job.preview || []).length}`);
    console.log(`[IMPORT] Valid non-duplicate rows: ${leadsToImport.length}`);

    if (leadsToImport.length === 0) {
      console.log(`[IMPORT] No leads to import, completing`);
      job.status = "completed";
      job.importedRows = 0;
      importJobs.set(jobId, job);
      return job;
    }

    // Fetch active sales agents for round-robin assignment
    const salesAgents = await TeamMember.find({
      organizationId,
      role: { $in: ["sales_agent", "manager"] },
      status: "active",
    })
      .select("_id name")
      .lean();

    console.log(`[IMPORT] Active sales agents found: ${salesAgents.length}`);

    const documents = leadsToImport.map((row, index) => {
      let assignedTo = "";
      let assignedToName = "";

      // Round-robin assignment if salespeople exist
      if (salesAgents.length > 0) {
        const agent = salesAgents[index % salesAgents.length];
        assignedTo = String(agent._id);
        assignedToName = agent.name;
      }

      return {
        name: row.name,
        phone: row.phone,
        email: row.email,
        company: row.company,
        source: row.source,
        sourceUrl: row.sourceUrl,
        requirement: row.requirement,
        notes: row.notes,
        location: row.location,
        status: "new" as const,
        priority: "medium" as const,
        assignedTo,
        assignedToName,
        organizationId,
        createdBy,
      };
    });

    console.log(`[IMPORT] Documents prepared: ${documents.length}`);
    console.log(`[IMPORT] Sample document:`, JSON.stringify(documents[0], null, 2));

    const result = await Lead.insertMany(documents, { ordered: false });

    console.log(`[IMPORT] insertMany result type: ${typeof result}, isArray: ${Array.isArray(result)}`);

    // Mongoose insertMany returns an array of inserted docs
    const insertedCount = Array.isArray(result) ? result.length : 0;

    console.log(`[IMPORT] Successfully inserted: ${insertedCount}`);

    job.status = "completed";
    job.importedRows = insertedCount;
    importJobs.set(jobId, job);

    return job;
  } catch (error) {
    console.error(`[IMPORT] Error during import:`, error);
    job.status = "failed";
    job.errors.push(error instanceof Error ? error.message : "Import failed");
    importJobs.set(jobId, job);
    return job;
  }
}
