"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCRMData } from "@/lib/crm-data-context"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus, X, ExternalLink } from "lucide-react"
import { LeadForm } from "@/components/crm/lead-form"
import Link from "next/link"
import type { Lead } from "@/lib/types"

export default function PlatformLeadsPage() {
  const { user } = useAuth()
  const { leads, deleteLead } = useCRMData()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)

  const orgLeads = leads.filter((l) => l.organizationId === user?.organizationId)

  const filtered = orgLeads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.company.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
    const matchStatus = !statusFilter || l.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} leads</p>
        </div>
        <Button onClick={() => { setEditLead(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Lead
        </Button>
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
    </div>
  )
}
