"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCRMData } from "@/lib/crm-data-context"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus, X, ExternalLink, Upload, FileSpreadsheet, CheckCircle } from "lucide-react"
import { LeadForm } from "@/components/crm/lead-form"
import Link from "next/link"
import type { Lead } from "@/lib/types"

export default function PlatformLeadsPage() {
  const { user } = useAuth()
  const { leads, deleteLead, fetchLeads } = useCRMData()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; error?: string } | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const orgLeads = leads.filter((l) => l.organizationId === user?.organizationId)

  const filtered = orgLeads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.company.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
    const matchStatus = !statusFilter || l.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append("file", importFile)
      const res = await fetch(`/api/leads/import?organizationId=${user?.organizationId || ""}`, { method: "POST", body: fd })
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
        setImportResult({ imported: 0, error: "No valid rows to import" })
        return
      }

      const confirmRes = await fetch(`/api/leads/import/${data.job.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows, organizationId: user?.organizationId }),
      })
      const confirmData = await confirmRes.json()
      if (!confirmData.success) throw new Error(confirmData.error)
      setImportResult({ imported: confirmData.imported })
      fetchLeads()
    } catch (err) {
      setImportResult({ imported: 0, error: err instanceof Error ? err.message : "Import failed" })
    }
    setImporting(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowImport(true); setImportResult(null); setImportFile(null) }}>
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <Button onClick={() => { setEditLead(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Add Lead
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full max-w-xs rounded-md border border-border bg-white px-3 text-[13px] outline-none" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-border bg-white px-3 text-[13px] outline-none">
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="processing">Processing</option>
          <option value="hot_lead">Hot Lead</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <div className="rounded-lg border border-border bg-white overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground hidden md:table-cell">Company</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground hidden md:table-cell">Email</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-[13px] font-medium">{lead.name}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{lead.company}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{lead.phone}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{lead.email}</td>
                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/platform/leads/${lead.id}`} className="rounded p-1 hover:bg-muted"><ExternalLink className="h-3.5 w-3.5" /></Link>
                    <Button variant="ghost" size="icon-sm" onClick={() => { setEditLead(lead); setShowForm(true) }}><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteLead(lead.id)}><X className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No leads found</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editLead ? "Edit Lead" : "Add Lead"}</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <LeadForm lead={editLead} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Import Leads</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowImport(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center space-y-3">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-[13px] font-medium">Upload CSV or Excel file</p>
                <p className="text-[12px] text-muted-foreground">Supports .csv, .xlsx, .xls</p>
              </div>
              <input ref={importInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
              <Button variant="outline" onClick={() => importInputRef.current?.click()}>Choose File</Button>
              {importFile && (
                <div className="flex items-center justify-center gap-2 text-[13px]">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{importFile.name}</span>
                  <button onClick={() => setImportFile(null)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </div>
              )}
            </div>
            {importResult && (
              <div className={`rounded-lg border p-3 text-[13px] ${importResult.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {importResult.error ? importResult.error : (
                  <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {importResult.imported} leads imported successfully</span>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowImport(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleImport} disabled={!importFile || importing}>
                {importing ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
