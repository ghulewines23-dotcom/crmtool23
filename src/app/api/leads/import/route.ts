import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import Subscription from "@/models/Subscription";
import { requireAuth } from "@/lib/api-auth";
import { parseFile } from "@/lib/import/file-parser";
import { mapColumns, mapRowToCanonical } from "@/lib/import/column-mapper";
import { validateLead } from "@/lib/import/validator";
import { normalizeLead } from "@/lib/import/normalizer";
import { checkDuplicatesBatch } from "@/lib/import/duplicate-checker";
import { PLAN_LIMITS } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, details?: Record<string, unknown>) {
  return Response.json({ success: false, error: message, ...details }, { status });
}

/**
 * POST /api/leads/import
 * Step 1: Upload file (FormData) → parse, validate, return preview rows.
 * Step 2 (via /api/leads/import/[jobId]): Confirm import → insert into DB.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  // SERENE_OWNER must pass organizationId in body (cross-org)
  let orgId = auth.user.organizationId;
  if (auth.user.role === "SERENE_OWNER") {
    const cloned = request.clone();
    try {
      const jsonBody = await cloned.json().catch(() => null);
      if (jsonBody?.organizationId) {
        orgId = jsonBody.organizationId;
      }
    } catch { /* ignore */ }
    // If we get a FormData (file upload), we can't read orgId from it directly.
    // Fall back: accept it from a query param or header.
    if (!orgId) {
      const { searchParams } = new URL(request.url);
      orgId = searchParams.get("organizationId") || "";
    }
  }

  if (!orgId) {
    return jsonError("Organization not found. Please select an organization.", 400);
  }

  try {
    await connectDB();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonError("No file uploaded", 400);
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
      return jsonError("Unsupported file type. Use CSV or Excel.", 400);
    }

    // Parse file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = parseFile(buffer, file.name);

    if (parsed.rows.length === 0) {
      return jsonError("File is empty or has no data rows", 400);
    }

    // Map columns
    const { mapping, unmappedHeaders } = mapColumns(parsed.headers);
    const mappedRows = parsed.rows.map((row) => mapRowToCanonical(row as Record<string, string | number | boolean | null>, mapping));

    // Check subscription for capacity
    const subscription = await Subscription.findOne({ organizationId: orgId });
    const maxLeads = subscription ? subscription.maxLeads : PLAN_LIMITS.FREE_TRIAL.maxLeads;
    const currentLeadCount = await Lead.countDocuments({ organizationId: orgId });

    // Batch duplicate check
    const duplicates = await checkDuplicatesBatch(mappedRows, orgId);

    // Build preview rows
    const preview = mappedRows.map((row, i) => {
      const normalized = normalizeLead(row);
      const validation = validateLead(normalized, i);
      const dupResult = duplicates.get(i);

      return {
        index: i,
        name: normalized.name,
        phone: normalized.phone,
        email: normalized.email,
        company: normalized.company,
        category: (row as any).category || "",
        source: normalized.source,
        sourceUrl: normalized.sourceUrl,
        requirement: normalized.requirement,
        location: normalized.location,
        notes: normalized.notes,
        rawExcelData: parsed.rows[i],
        isValid: validation.isValid,
        isDuplicate: dupResult?.isDuplicate ?? false,
        duplicateType: dupResult?.duplicateType ?? null,
        errors: validation.errors.map((e) => e.message),
        warnings: validation.warnings.map((w) => w.message),
      };
    });

    const validLeads = preview.filter((r) => r.isValid && !r.isDuplicate).length;
    const jobId = crypto.randomUUID();

    return Response.json({
      success: true,
      job: {
        id: jobId,
        fileName: file.name,
        status: "preview",
        totalRows: parsed.totalRows,
        validLeads,
        invalidRows: preview.filter((r) => !r.isValid).length,
        duplicateRows: preview.filter((r) => r.isDuplicate).length,
        importedRows: 0,
        errors: [],
        warnings: [],
        preview,
        mapping,
        unmappedHeaders,
        detectedHeaderRow: parsed.headerRowIndex,
      },
      capacityCheck: {
        currentLeadCount,
        maxLeads,
        remainingCapacity: Math.max(0, maxLeads - currentLeadCount),
        importBatchSize: validLeads,
        willFit: currentLeadCount + validLeads <= maxLeads,
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    return jsonError("Failed to parse import file", 500);
  }
}
