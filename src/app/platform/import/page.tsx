"use client"
import { useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCRMData } from "@/lib/crm-data-context"
import { Upload, FileSpreadsheet, X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PlatformImportPage() {
  const { user } = useAuth()
  const { fetchLeads } = useCRMData()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ imported: number; error?: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async () => {
    if (!file || !user?.organizationId) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/leads/import?organizationId=${user.organizationId}`, { method: "POST", body: fd })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      const validRows = (data.job.preview || [])
        .filter((r: { isValid: boolean; isDuplicate: boolean }) => r.isValid && !r.isDuplicate)
        .map((r: { name: string; phone: string; email: string; company: string; source: string; sourceUrl: string; requirement: string; location: string; notes: string }) => ({
          name: r.name, phone: r.phone, email: r.email, company: r.company,
          source: r.source, sourceUrl: r.sourceUrl, requirement: r.requirement,
          location: r.location, notes: r.notes,
        }))

      if (validRows.length === 0) {
        setResult({ imported: 0, error: "No valid rows to import" })
        return
      }

      const confirmRes = await fetch(`/api/leads/import/${data.job.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows, organizationId: user.organizationId }),
      })
      const confirmData = await confirmRes.json()
      if (!confirmData.success) throw new Error(confirmData.error)
      setResult({ imported: confirmData.imported })
      fetchLeads()
    } catch (err) {
      setResult({ imported: 0, error: err instanceof Error ? err.message : "Import failed" })
    }
    setUploading(false)
  }, [file, user?.organizationId, fetchLeads])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Import Leads</h1>
      <div className="rounded-lg border-2 border-dashed border-gray-700 bg-[#111] p-12 text-center space-y-4">
        <Upload className="mx-auto h-8 w-8 text-gray-500" />
        <div>
          <p className="text-[13px] font-medium text-white">Upload CSV or Excel file</p>
          <p className="text-[12px] text-gray-500">Supports .csv, .xlsx, .xls</p>
        </div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Button variant="outline" onClick={() => inputRef.current?.click()} className="border-gray-700 text-gray-300 hover:bg-gray-800">Choose File</Button>
        {file && (
          <div className="flex items-center justify-center gap-2 text-[13px] text-white">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{file.name}</span>
            <button onClick={() => setFile(null)}><X className="h-3.5 w-3.5 text-gray-500" /></button>
          </div>
        )}
        {file && (
          <Button onClick={handleUpload} disabled={uploading} className="bg-white text-black hover:bg-gray-200">
            {uploading ? "Importing..." : "Import"}
          </Button>
        )}
      </div>
      {result && (
        <div className={`rounded-lg border p-4 text-[13px] ${result.error ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>
          {result.error ? result.error : <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {result.imported} leads imported successfully</span>}
        </div>
      )}
    </div>
  )
}
