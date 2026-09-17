"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Check, Clock } from "lucide-react"

interface TeamMember { id: string; name: string; email: string; phone: string; role: string; avatar: string; status: string; activeLeads: number }

function formatRole(r: string) {
  if (r === "FOUNDER" || r === "SERENE_OWNER") return "Owner"
  return r.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

export default function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pending, setPending] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [approving, setApproving] = useState<string | null>(null)

  const isFounder = user?.role === "FOUNDER" || user?.role === "SERENE_OWNER"

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team", { credentials: "same-origin" })
      const data = await res.json()
      // Team tab shows only APPROVED (active) members — includes the owner
      if (data.success) setMembers(data.members.filter((m: TeamMember) => m.status === "active"))
    } catch { }
    setLoading(false)
  }, [])

  const fetchPending = useCallback(async () => {
    if (!isFounder) return
    try {
      const res = await fetch("/api/team?pending=true", { credentials: "same-origin" })
      const data = await res.json()
      if (data.success) setPending(data.members)
    } catch { }
  }, [isFounder])

  const approveMember = useCallback(async (id: string) => {
    setApproving(id)
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: "active" }),
      })
      const data = await res.json()
      if (data.success) {
        setPending((prev) => prev.filter((m) => m.id !== id))
        await fetchMembers()
      }
    } catch { }
    setApproving(null)
  }, [fetchMembers])

  useEffect(() => {
    // Defer slightly so state updates never happen synchronously inside the effect.
    const t = window.setTimeout(() => {
      fetchMembers()
      fetchPending()
    }, 0)
    return () => window.clearTimeout(t)
  }, [fetchMembers, fetchPending])

  const filtered = members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{members.length} team members</p>
      </div>

      <div className="rounded-lg border border-border bg-white">
        <div className="border-b border-border px-4 py-3">
          <input type="text" placeholder="Search team members..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-full max-w-xs rounded-md border border-border bg-white px-3 text-[12px] outline-none placeholder:text-muted-foreground focus:border-foreground/30" />
        </div>

        {/* Pending Approvals — only the org owner can approve new members */}
        {isFounder && pending.length > 0 && (
          <div className="border-b border-border bg-amber-50/50 px-4 py-3">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              Pending Approvals ({pending.length})
            </div>
            <div className="mt-2 space-y-2">
              {pending.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border-amber-200 bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{m.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{m.email} · {formatRole(m.role)}</p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 shrink-0 gap-1 text-[12px]"
                    onClick={() => approveMember(m.id)}
                    disabled={approving === m.id}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {approving === m.id ? "Approving..." : "Approve"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Leads</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[13px] font-medium">{member.name}</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.phone}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{formatRole(member.role)}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.activeLeads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">No team members found</p>
          </div>
        )}
      </div>
    </div>
  )
}
