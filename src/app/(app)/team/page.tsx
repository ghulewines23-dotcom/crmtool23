"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TeamMember { id: string; name: string; email: string; phone: string; role: string; avatar: string; status: string; activeLeads: number }

function formatRole(r: string) { return r.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") }

export default function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team", { credentials: "same-origin" })
      const data = await res.json()
      if (data.success) setMembers(data.members.filter((m: TeamMember) => m.role !== "FOUNDER" && m.role !== "SERENE_OWNER"))
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Email</th>
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
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.email}</td>
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
