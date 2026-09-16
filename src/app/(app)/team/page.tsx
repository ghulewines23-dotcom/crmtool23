"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Copy, Check, Link2, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  avatar: string
  activeLeads: number
  status: string
}

function formatRole(role: string): string {
  return role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

function getAuthHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {}
  const match = document.cookie.match(/serene_session=([^;]+)/)
  return match ? { Authorization: `Bearer ${match[1]}` } : {}
}

export default function TeamPage() {
  const { user } = useAuth()
  const isFounder = user?.role === "FOUNDER"

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
      if (data.success) {
        setMembers(data.members.filter((m: TeamMember) => m.role !== "FOUNDER"))
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd() {
    if (!form.name || !form.email) return
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "same-origin",
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || "Failed to create invite")
        setSubmitting(false)
        return
      }
      setInviteLink(data.inviteLink)
      setForm({ name: "", email: "", phone: "", role: "SALES_PERSON" })
    } catch {
      setError("Failed to create invite")
    }
    setSubmitting(false)
  }

  function closeInviteLink() {
    setInviteLink("")
    setLinkCopied(false)
    setAddOpen(false)
    fetchMembers()
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function openEdit(member: TeamMember) {
    setEditing(member)
    setEditForm({ name: member.name, email: member.email, phone: member.phone, role: member.role })
    setEditOpen(true)
  }

  async function handleUpdate() {
    if (!editing || !editForm.name) return
    try {
      await fetch(`/api/team/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "same-origin",
        body: JSON.stringify(editForm),
      })
      setEditOpen(false)
      setEditing(null)
      fetchMembers()
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this team member?")) return
    try {
      await fetch(`/api/team/${id}`, { method: "DELETE", headers: getAuthHeaders(), credentials: "same-origin" })
      fetchMembers()
    } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{members.length} team members</p>
        </div>
        {isFounder && (
          <Button className="h-9 rounded-md" onClick={() => { setAddOpen(true); setError(""); setInviteLink("") }}>
            <Plus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-white">
        <div className="border-b border-border px-4 py-3">
          <input
            type="text"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full max-w-xs rounded-md border border-border bg-white px-3 text-[12px] outline-none placeholder:text-muted-foreground focus:border-foreground/30"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Email</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Leads</th>
                {isFounder && (
                  <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-3">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-muted text-[11px] font-medium text-foreground">{member.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] font-medium">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.email}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{formatRole(member.role)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      member.status === "active" ? "bg-emerald-50 text-emerald-700" :
                      member.status === "pending_access" ? "bg-amber-50 text-amber-700" :
                      member.status === "invited" ? "bg-blue-50 text-blue-700" :
                      "bg-gray-50 text-gray-600"
                    }`}>
                      {member.status === "pending_access" ? "Pending" : member.status === "invited" ? "Invited" : formatRole(member.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.activeLeads}</td>
                  {isFounder && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(member)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(member.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">No team members found</p>
            <p className="mt-1 text-[12px] text-muted-foreground/60">
              {isFounder ? "Invite your first team member to get started." : "No other team members yet."}
            </p>
          </div>
        )}
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) { setInviteLink(""); setError("") } }}>
        <DialogContent>
          {inviteLink ? (
            <>
              <DialogHeader>
                <DialogTitle>Invite Link Ready</DialogTitle>
                <DialogDescription>Share this link with the person you want to invite.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="flex-1 truncate text-[13px] text-foreground">{inviteLink}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyLink} className="flex-1">
                    {linkCopied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                    {linkCopied ? "Copied!" : "Copy Link"}
                  </Button>
                  <Button variant="outline" onClick={closeInviteLink} className="flex-1">Done</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>They&apos;ll receive an invite link to create their account.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
                )}
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone (optional)</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none">
                    <option value="SALES_PERSON">Sales Person</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={submitting}>
                  {submitting ? "Generating..." : "Generate Invite Link"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Update the member details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Full name" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="email@example.com" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none">
                <option value="SALES_PERSON">Sales Person</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
