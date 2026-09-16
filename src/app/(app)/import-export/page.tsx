"use client";

import { useState, useCallback, useRef } from "react";
import { useCRMData } from "@/lib/crm-data-context";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react";

interface PreviewRow {
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

interface ImportJob {
  id: string;
  fileName: string;
  status: string;
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
}

type ViewState = "upload" | "preview" | "importing" | "completed";

function getAuthHeaders(): Record<string, string> {
  return {};
}

export default function ImportLeadsPage() {
  const { fetchLeads, addLeads } = useCRMData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewState, setViewState] = useState<ViewState>("upload");
  const [job, setJob] = useState<ImportJob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
        cache: "no-store",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to upload file");
      }

      setJob(data.job);
      setViewState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleConfirmImport = useCallback(async () => {
    if (!job) return;
    setImporting(true);
    setViewState("importing");
    setError(null);

    try {
      // Send valid rows directly in the body — no in-memory Map dependency
      const validRows = (job.preview || [])
        .filter((row) => row.isValid && !row.isDuplicate)
        .map((row) => ({
          name: row.name,
          phone: row.phone,
          email: row.email,
          company: row.company,
          source: row.source,
          sourceUrl: row.sourceUrl,
          requirement: row.requirement,
          location: row.location,
          notes: row.notes,
          rawExcelData: (row as any).rawExcelData || row,
        }));

      console.log(`[IMPORT UI] Sending ${validRows.length} valid rows to confirm`);

      const response = await fetch(`/api/leads/import/${job.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ rows: validRows }),
        cache: "no-store",
      });

      const data = await response.json();
      console.log(`[IMPORT UI] Response:`, data);

      if (!data.success) throw new Error(data.error || "Import failed");

      // Update job with actual DB results
      const updatedJob = {
        ...job,
        status: "completed" as const,
        importedRows: data.imported ?? 0,
        errors: data.errors ?? [],
      };

      setJob(updatedJob);
      setViewState("completed");

      // Add imported leads directly to state (more reliable than re-fetch)
      if (data.insertedLeads && Array.isArray(data.insertedLeads)) {
        addLeads(data.insertedLeads);
      }

      // Also re-fetch to ensure consistency
      await fetchLeads();
    } catch (err) {
      console.error(`[IMPORT UI] Error:`, err);
      setError(err instanceof Error ? err.message : "Import failed");
      setViewState("preview");
    } finally {
      setImporting(false);
    }
  }, [job, fetchLeads]);

  const handleReset = useCallback(() => {
    setViewState("upload");
    setJob(null);
    setError(null);
    setShowAllRows(false);
  }, []);

  const previewRows = job?.preview || [];
  const displayedRows = showAllRows ? previewRows : previewRows.slice(0, 25);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">
            Import Leads
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Upload Excel or CSV files to import leads into your CRM.
          </p>
        </div>
        {viewState !== "upload" && (
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleReset}>
            <RefreshCw className="h-4 w-4" />
            Import Another File
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {/* Upload State */}
      {viewState === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
          />
          {uploading ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-[15px] font-medium text-foreground">
                Drop your file here or click to browse
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Supports .csv, .xlsx, .xls (max 10MB)
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Title rows and metadata above headers are automatically detected and skipped.
              </p>
            </>
          )}
        </div>
      )}

      {/* Preview State */}
      {viewState === "preview" && job && (
        <>
          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Total Rows
              </p>
              <p className="mt-1 text-[20px] font-semibold">{job.totalRows}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wide">
                Valid Leads
              </p>
              <p className="mt-1 text-[20px] font-semibold text-emerald-700">{job.validLeads}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wide">
                Duplicates
              </p>
              <p className="mt-1 text-[20px] font-semibold text-amber-700">{job.duplicateRows}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-[11px] font-medium text-red-600 uppercase tracking-wide">
                Invalid
              </p>
              <p className="mt-1 text-[20px] font-semibold text-red-700">{job.invalidRows}</p>
            </div>
          </div>

          {/* Detected Header Row */}
          {job.detectedHeaderRow !== undefined && (
            <div className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="text-[13px] font-medium">
                  Detected Header Row: <span className="font-semibold text-primary">Row {job.detectedHeaderRow + 1}</span>
                </p>
              </div>
              {job.detectedHeaderRow > 0 && (
                <p className="text-[12px] text-muted-foreground">
                  Skipped {job.detectedHeaderRow} row{job.detectedHeaderRow > 1 ? "s" : ""} of title/metadata before the actual column headers.
                </p>
              )}
            </div>
          )}

          {/* Column Mapping */}
          {job.mapping && Object.keys(job.mapping).length > 0 && (
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-[13px] font-medium mb-2">Mapped Columns</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(job.mapping).map(([original, mapped]) => (
                  <span
                    key={original}
                    className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-[12px]"
                  >
                    <span className="text-muted-foreground">{original}</span>
                    <span className="text-muted-foreground">&rarr;</span>
                    <span className="font-medium capitalize">{mapped}</span>
                  </span>
                ))}
              </div>
              {job.unmappedHeaders && job.unmappedHeaders.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[11px] text-muted-foreground mb-1">Unmapped columns (skipped):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.unmappedHeaders.map((h) => (
                      <span key={h} className="inline-flex rounded-md bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground line-through">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {job.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-[13px] font-medium text-amber-800 mb-2">Warnings</p>
              <ul className="space-y-1">
                {job.warnings.slice(0, 5).map((w, i) => (
                  <li key={i} className="text-[12px] text-amber-700">{w}</li>
                ))}
                {job.warnings.length > 5 && (
                  <li className="text-[12px] text-amber-600">+{job.warnings.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Invalid Rows Errors */}
          {job.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-[13px] font-medium text-red-800 mb-2">Invalid Rows</p>
              <ul className="space-y-1">
                {job.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="text-[12px] text-red-700">{e}</li>
                ))}
                {job.errors.length > 5 && (
                  <li className="text-[12px] text-red-600">+{job.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div className="rounded-lg border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-[13px] font-medium">
                Preview ({displayedRows.length} of {previewRows.length} rows)
              </h3>
              {previewRows.length > 25 && (
                <button
                  onClick={() => setShowAllRows(!showAllRows)}
                  className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllRows ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Show all <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 uppercase tracking-wide w-20">
                      Status
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 uppercase tracking-wide">
                      Company
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 uppercase tracking-wide">
                      Phone
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 uppercase tracking-wide hidden md:table-cell">
                      Name
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 uppercase tracking-wide hidden md:table-cell">
                      Email
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 uppercase tracking-wide hidden lg:table-cell">
                      Location
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 uppercase tracking-wide hidden lg:table-cell">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={`border-b border-border last:border-0 ${
                        !row.isValid
                          ? "bg-red-50/50"
                          : row.isDuplicate
                          ? "bg-amber-50/50"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        {!row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-red-600">
                            <X className="h-3 w-3" />
                            Invalid
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-amber-600">
                            <Copy className="h-3 w-3" />
                            Dup
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] font-medium">
                        {row.company || <span className="text-muted-foreground">&mdash;</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] font-mono">
                        {row.phone || <span className="text-muted-foreground">&mdash;</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-muted-foreground hidden md:table-cell">
                        {row.name || <span className="text-muted-foreground">&mdash;</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-muted-foreground hidden md:table-cell">
                        {row.email || <span className="text-muted-foreground">&mdash;</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-muted-foreground hidden lg:table-cell">
                        {row.location || <span className="text-muted-foreground">&mdash;</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-muted-foreground hidden lg:table-cell">
                        {row.source || <span className="text-muted-foreground">&mdash;</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Button */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" className="h-9" onClick={handleReset}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5"
              onClick={handleConfirmImport}
              disabled={importing || job.validLeads === 0}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Import {job.validLeads} Lead{job.validLeads !== 1 ? "s" : ""}
            </Button>
          </div>
        </>
      )}

      {/* Importing State */}
      {viewState === "importing" && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-[15px] font-medium">Importing leads...</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            Please wait while we save your leads.
          </p>
        </div>
      )}

      {/* Completed State */}
      {viewState === "completed" && job && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mb-3" />
            <p className="text-[18px] font-semibold text-emerald-800">Import Complete!</p>
            <p className="text-[13px] text-emerald-700 mt-1">
              {job.importedRows} lead{job.importedRows !== 1 ? "s" : ""} imported successfully.
            </p>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total Rows</p>
              <p className="mt-1 text-[20px] font-semibold">{job.totalRows}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wide">Imported</p>
              <p className="mt-1 text-[20px] font-semibold text-emerald-700">{job.importedRows}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wide">Duplicates Skipped</p>
              <p className="mt-1 text-[20px] font-semibold text-amber-700">{job.duplicateRows}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-[11px] font-medium text-red-600 uppercase tracking-wide">Invalid Skipped</p>
              <p className="mt-1 text-[20px] font-semibold text-red-700">{job.invalidRows}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
