"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useCRMData } from "@/lib/crm-data-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { TeamMember } from "@/lib/types";

function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function TeamPage() {
  const { teamMembers, addTeamMembers, updateTeamMember, deleteTeamMember } = useCRMData();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "SALES_PERSON" as TeamMember["role"] });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "SALES_PERSON" as TeamMember["role"] });

  const filtered = teamMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase())
  );

  function handleAdd() {
    if (!form.name || !form.email) return;
    const initials = form.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      avatar: initials,
      activeLeads: 0,
      activeTasks: 0,
      completedTasks: 0,
      projects: 0,
      status: "active",
      organizationId: "",
    };
    addTeamMembers([newMember]);
    setForm({ name: "", email: "", phone: "", role: "SALES_PERSON" });
    setAddOpen(false);
  }

  function openEdit(member: TeamMember) {
    setEditing(member);
    setEditForm({ name: member.name, email: member.email, phone: member.phone, role: member.role });
    setEditOpen(true);
  }

  function handleUpdate() {
    if (!editing || !editForm.name || !editForm.email) return;
    const initials = editForm.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    updateTeamMember(editing.id, {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      role: editForm.role,
      avatar: initials,
    });
    setEditOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    deleteTeamMember(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{teamMembers.length} team members</p>
        </div>
        <Button className="h-9 rounded-md" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
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
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Leads</th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-3">Actions</th>
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
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.phone}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{formatRole(member.role)}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.activeLeads}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">No team members found</p>
            <p className="mt-1 text-[12px] text-muted-foreground/60">Try adjusting your search.</p>
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Fill in the details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="h-9 text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamMember["role"] })} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none">
                <option value="SALES_PERSON">Sales Person</option>
                <option value="ADMIN">Admin</option>
                <option value="FOUNDER">Founder</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Member</Button>
          </DialogFooter>
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
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as TeamMember["role"] })} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none">
                <option value="SALES_PERSON">Sales Person</option>
                <option value="ADMIN">Admin</option>
                <option value="FOUNDER">Founder</option>
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
  );
}
