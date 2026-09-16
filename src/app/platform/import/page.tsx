"use client"
import { useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Upload, FileSpreadsheet, X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PlatformImportPage() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ imported: number; error?: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/leads/import", { method: "POST", body: fd })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      // Confirm import with valid rows
      const validRows = (data.job.preview || []).filter((r: { isValid: boolean; isDuplicate: boolean }) => r.isValid && !r.isDuplicate).map((r: { name: string; phone: string; email: string; company: string; source: string; sourceUrl: string; requirement: string; location: string; notes: string }) => ({ name: r.name, phone: r.phone, email: r.email, company: r.company, source: r.source, sourceUrl: r.sourceUrl, requirement: r.requirement, location: r.location, notes: r.notes }))

      if (validRows.length === 0) {
        setResult({ imported: 0, error: "No valid rows to import" })
        return
      }

      const confirmRes = await fetch(`/api/leads/import/${data.job.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: validRows }) })
      const confirmData = await confirmRes.json()
      if (!confirmData.success) throw new Error(confirmData.error)
      setResult({ imported: confirmData.imported })
    } catch (err) {
      setResult({ imported: 0, error: err instanceof Error ? err.message : "Import failed" })
    }
    setUploading(false)
  }, [file])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Import Leads</h1>
      <div className="rounded-lg border-2 border-dashed border-border bg-white p-12 text-center space-y-4">
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <div><p className="text-[13px] font-medium">Upload CSV or Excel file</p><p className="text-[12px] text-muted-foreground">Supports .csv, .xlsx, .xls</p></div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Button variant="outline" onClick={() => inputRef.current?.click()}>Choose File</Button>
        {file && (
          <div className="flex items-center justify-center gap-2 text-[13px]">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{file.name}</span>
            <button onClick={() => setFile(null)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
          </div>
        )}
        {file && <Button onClick={handleUpload} disabled={uploading}>{uploading ? "Importing..." : "Import"}</Button>}
      </div>
      {result && (
        <div className={`rounded-lg border p-4 text-[13px] ${result.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {result.error ? result.error : <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {result.imported} leads imported successfully</span>}
        </div>
      )}
    </div>
  )
}
