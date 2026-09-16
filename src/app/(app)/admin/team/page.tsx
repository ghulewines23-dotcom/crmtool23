"use client";

import { useState, useRef, useEffect } from "react";
import { useCRMData } from "@/lib/crm-data-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Pencil, Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { TeamMember } from "@/lib/types";

function formatRole(role: string): string {
  if (role === "SERENE_OWNER") return "Serene Owner";
  if (role === "FOUNDER") return "Owner / Founder";
  return role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getAuthHeaders(): Record<string, string> {
  return {};
}

export default function AdminTeamPage() {
  const { teamMembers, addTeamMembers, updateTeamMember, deleteTeamMember, fetchTeamMembers } = useCRMData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState<"active" | "inactive">("active");
  const [bulkLoading, setBulkLoading] = useState(false);

  const headerRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "SALES_PERSON" as TeamMember["role"], isSalesEligible: true });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "SALES_PERSON" as TeamMember["role"], isSalesEligible: true });

  const filtered = teamMembers.filter((m) => {
    if (statusFilter === "active" && m.status !== "active") return false;
    if (statusFilter === "inactive" && m.status !== "inactive") return false;
    if (roleFilter !== "all" && m.role !== roleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(s) ||
        m.email.toLowerCase().includes(s) ||
        m.role.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Selection
  const allOnPageSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));
  const someSelected = filtered.some((m) => selected.has(m.id));
  const selectedArray = [...selected];
  const hasOwner = selectedArray.some((id) => teamMembers.find((m) => m.id === id && m.role === "FOUNDER"));

  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.indeterminate = someSelected && !allOnPageSelected;
    }
  }, [someSelected, allOnPageSelected]);

  useEffect(() => {
    setSelected(new Set());
  }, [search, statusFilter, roleFilter]);

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((m) => m.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  async function handleAdd() {
    if (!form.name || !form.email) return;
    await addTeamMembers([{
      id: "", name: form.name, email: form.email, phone: form.phone,
      role: form.role, avatar: "", activeLeads: 0, activeTasks: 0,
      completedTasks: 0, projects: 0, status: "active", organizationId: "",
      isSalesEligible: form.isSalesEligible,
      secondaryRole: form.isSalesEligible ? "SALES_PERSON" : "",
    }]);
    setForm({ name: "", email: "", phone: "", role: "SALES_PERSON", isSalesEligible: true });
    setAddOpen(false);
  }

  function openEdit(member: TeamMember) {
    setEditing(member);
    setEditForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      isSalesEligible: member.isSalesEligible !== undefined ? member.isSalesEligible : true,
    });
    setEditOpen(true);
  }

  async function handleUpdate() {
    if (!editing || !editForm.name || !editForm.email) return;
    await updateTeamMember(editing.id, {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      role: editForm.role,
      isSalesEligible: editForm.isSalesEligible,
      secondaryRole: editForm.isSalesEligible ? "SALES_PERSON" : "",
    });
    setEditOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this team member?")) return;
    setDeleting(id);
    await deleteTeamMember(id);
    setDeleting(null);
  }

  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/team/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        setBulkDeleteOpen(false);
        fetchTeamMembers();
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
    }
    setBulkLoading(false);
  }

  async function handleBulkStatus() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/team/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ids: [...selected], status: bulkStatusValue }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        setBulkStatusOpen(false);
        fetchTeamMembers();
      }
    } catch (error) {
      console.error("Bulk status failed:", error);
    }
    setBulkLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Manage Team</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{teamMembers.length} team members</p>
        </div>
        <Button className="h-9 rounded-md gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-white px-3 text-[13px] outline-none focus:border-primary/40"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-white px-3 text-[13px] outline-none focus:border-primary/40"
        >
          <option value="all">All Roles</option>
          <option value="FOUNDER">Founder</option>
          <option value="ADMIN">Admin</option>
          <option value="SALES_PERSON">Sales Person</option>
        </select>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-[13px] font-semibold text-primary">{selected.size} selected</span>
          {hasOwner && (
            <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              Owner cannot be modified
            </span>
          )}
          <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={() => setBulkStatusOpen(true)}>
            Change Status
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[12px] text-red-600 border-red-200 hover:bg-red-50" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remove
          </Button>
          <button onClick={clearSelection} className="ml-auto text-[12px] text-muted-foreground hover:text-foreground underline">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-4 py-2.5">
                  <input
                    ref={headerRef}
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                </th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5">Name</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Email</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Phone</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5">Role</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Status</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Leads</th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  className={`border-b border-border last:border-0 transition-colors ${
                    selected.has(member.id) ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(member.id)}
                      onChange={() => toggleRow(member.id)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-muted text-[11px] font-medium text-foreground">{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium flex items-center gap-1.5">
                          {member.name}
                          {(member.role === "FOUNDER" || member.role === "SERENE_OWNER") && (
                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                              Owner
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.email}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.phone}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{formatRole(member.role)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${
                      member.status === "active"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                      {member.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{member.activeLeads}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(member)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(member.id)} disabled={deleting === member.id} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-[13px] text-muted-foreground">No team members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle><DialogDescription>Fill in the details below.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamMember["role"] })} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none">
                <option value="SALES_PERSON">Sales Person</option><option value="ADMIN">Admin</option><option value="FOUNDER">Founder</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t pt-3">
              <input
                type="checkbox"
                id="add-sales-eligible"
                checked={form.isSalesEligible}
                onChange={(e) => setForm({ ...form, isSalesEligible: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <Label htmlFor="add-sales-eligible" className="text-[12px] font-medium cursor-pointer">
                Also handles Sales (Auto-assign lead shares to this member)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Team Member</DialogTitle><DialogDescription>Update member details.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Full name" className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="email@example.com" className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as TeamMember["role"] })} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none">
                <option value="SALES_PERSON">Sales Person</option><option value="ADMIN">Admin</option><option value="FOUNDER">Founder</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t pt-3">
              <input
                type="checkbox"
                id="edit-sales-eligible"
                checked={editForm.isSalesEligible}
                onChange={(e) => setEditForm({ ...editForm, isSalesEligible: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <Label htmlFor="edit-sales-eligible" className="text-[12px] font-medium cursor-pointer">
                Also handles Sales (Auto-assign lead shares to this member)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {selected.size} members?</DialogTitle>
            <DialogDescription>Selected members will be removed. Owner accounts are protected.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>
              {bulkLoading ? "Removing..." : `Remove ${selected.size} Members`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change status for {selected.size} members</DialogTitle>
            <DialogDescription>Owner accounts will be skipped.</DialogDescription>
          </DialogHeader>
          <select
            value={bulkStatusValue}
            onChange={(e) => setBulkStatusValue(e.target.value as "active" | "inactive")}
            className="h-9 w-full rounded-lg border border-border bg-white px-3 text-[13px] outline-none focus:border-primary/40"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusOpen(false)} disabled={bulkLoading}>Cancel</Button>
            <Button onClick={handleBulkStatus} disabled={bulkLoading}>
              {bulkLoading ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
