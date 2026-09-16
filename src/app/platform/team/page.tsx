"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Plus, Pencil, Trash2, Copy, Check, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface TeamMember { id: string; name: string; email: string; phone: string; role: string; avatar: string; status: string; activeLeads: number }

function formatRole(r: string) { return r.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") }
function getAuthHeaders(): Record<string, string> { if (typeof document === "undefined") return {}; const m = document.cookie.match(/serene_session=([^;]+)/); return m ? { Authorization: `Bearer ${m[1]}` } : {} }

export default function PlatformTeamPage() {
  const { user } = useAuth()
  const isOwner = user?.role === "SERENE_OWNER"
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [inviteLink, setInviteLink] = useState("")
  const [linkCopied, setLinkCopied] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "SALES_PERSON" })
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "SALES_PERSON" })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team", { credentials: "same-origin", headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) setMembers(data.members.filter((m: TeamMember) => m.role !== "FOUNDER" && m.role !== "SERENE_OWNER"))
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const filtered = members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))

  async function handleAdd() {
    if (!form.name || !form.email) return
    setError(""); setSubmitting(true)
    try {
      const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, credentials: "same-origin", body: JSON.stringify(form) })
      const data = await res.json()
      if (!data.success) { setError(data.error || "Failed"); setSubmitting(false); return }
      setInviteLink(data.inviteLink)
      setForm({ name: "", email: "", phone: "", role: "SALES_PERSON" })
    } catch { setError("Failed") }
    setSubmitting(false)
  }

  function closeInviteLink() { setInviteLink(""); setLinkCopied(false); setAddOpen(false); fetchMembers() }
  async function copyLink() { await navigator.clipboard.writeText(inviteLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }
  function openEdit(m: TeamMember) { setEditing(m); setEditForm({ name: m.name, email: m.email, phone: m.phone, role: m.role }); setEditOpen(true) }
  async function handleUpdate() {
    if (!editing || !editForm.name) return
    await fetch(`/api/team/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, credentials: "same-origin", body: JSON.stringify(editForm) })
    setEditOpen(false); setEditing(null); fetchMembers()
  }
  async function handleDelete(id: string) { if (!confirm("Remove?")) return; await fetch(`/api/team/${id}`, { method: "DELETE", headers: getAuthHeaders(), credentials: "same-origin" }); fetchMembers() }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold">Team</h1><p className="text-sm text-muted-foreground">{members.length} members</p></div>
        {isOwner && <Button onClick={() => { setAddOpen(true); setError(""); setInviteLink("") }}><Plus className="h-4 w-4 mr-1" /> Invite</Button>}
      </div>
      <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full max-w-xs rounded-md border border-border bg-white px-3 text-[13px] outline-none" />
      <div className="rounded-lg border border-border bg-white overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground hidden md:table-cell">Email</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Status</th>
            {isOwner && <th className="text-right px-4 py-3 text-[11px] font-medium text-muted-foreground">Actions</th>}
          </tr></thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{m.avatar}</AvatarFallback></Avatar><span className="text-[13px] font-medium">{m.name}</span></div></td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{m.email}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{formatRole(m.role)}</td>
                <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${m.status === "active" ? "bg-emerald-50 text-emerald-700" : m.status === "pending_access" ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-600"}`}>{m.status === "pending_access" ? "Pending" : m.status}</span></td>
                {isOwner && <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon-sm" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon-sm" onClick={() => handleDelete(m.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No team members</p>}
      </div>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setInviteLink(""); setError("") } }}>
        <DialogContent>
          {inviteLink ? (
            <><DialogHeader><DialogTitle>Invite Link Ready</DialogTitle><DialogDescription>Share this link.</DialogDescription></DialogHeader>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"><Link2 className="h-4 w-4 shrink-0 text-muted-foreground" /><p className="flex-1 truncate text-[13px]">{inviteLink}</p></div>
              <div className="flex gap-2"><Button onClick={copyLink} className="flex-1">{linkCopied ? <><Check className="h-4 w-4 mr-1" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}</Button><Button variant="outline" onClick={closeInviteLink} className="flex-1">Done</Button></div></>
          ) : (
            <><DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}
                <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-[13px]" /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-[13px]" /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 text-[13px]" /></div>
                <div className="space-y-1.5"><Label>Role</Label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none"><option value="SALES_PERSON">Sales Person</option><option value="ADMIN">Admin</option></select></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={handleAdd} disabled={submitting}>{submitting ? "Generating..." : "Generate Link"}</Button></DialogFooter></>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5"><Label>Role</Label><select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none"><option value="SALES_PERSON">Sales Person</option><option value="ADMIN">Admin</option></select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleUpdate}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
