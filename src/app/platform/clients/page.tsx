"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useCRMData } from "@/lib/crm-data-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Search } from "lucide-react"
import Link from "next/link"

export default function PlatformClientsPage() {
  const { user } = useAuth()
  const { clients } = useCRMData()
  const [search, setSearch] = useState("")

  const orgClients = clients.filter((c) => c.organizationId === user?.organizationId)
  const filtered = orgClients.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} clients</p>
        </div>
        <Link href="/platform/clients"><Button><Plus className="h-4 w-4 mr-1" /> Add Client</Button></Link>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-md border border-border bg-white pl-9 pr-3 text-[13px] outline-none" />
      </div>
      <div className="rounded-lg border border-border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground hidden md:table-cell">Company</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground hidden md:table-cell">Service</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{c.avatar}</AvatarFallback></Avatar>
                    <span className="text-[13px] font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{c.company}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{c.email}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{c.service}</td>
                <td className="px-4 py-3 text-[13px]">₹{c.totalAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No clients found</p>}
      </div>
    </div>
  )
}
