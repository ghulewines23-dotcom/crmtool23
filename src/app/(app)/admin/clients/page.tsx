"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useCRMData } from "@/lib/crm-data-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2, Search, Pencil, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client, PaymentStatus } from "@/lib/types";

const statusColors: Record<PaymentStatus, string> = {
  paid: "bg-emerald-50 text-emerald-600 border-emerald-200",
  partial: "bg-amber-50 text-amber-600 border-amber-200",
  pending: "bg-slate-50 text-slate-600 border-slate-200",
  overdue: "bg-red-50 text-red-600 border-red-200",
};

function getAuthHeaders(): Record<string, string> {
  return {};
}

function emptyForm() {
  return {
    name: "", company: "", phone: "", email: "", website: "",
    loginUrl: "", loginEmail: "", password: "", accessNotes: "",
    service: "", totalAmount: "", amountPaid: "",
    paymentStatus: "pending" as PaymentStatus, dueDate: "", notes: "",
  };
}

export default function AdminClientsPage() {
  const { clients, addClient, deleteClient, fetchClients } = useCRMData();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const headerRef = useRef<HTMLInputElement>(null);

  const filtered = clients.filter((c) => {
    if (paymentFilter !== "all" && c.paymentStatus !== paymentFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(s) ||
        c.company.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        c.service.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Selection
  const allOnPageSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = filtered.some((c) => selected.has(c.id));

  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.indeterminate = someSelected && !allOnPageSelected;
    }
  }, [someSelected, allOnPageSelected]);

  useEffect(() => {
    setSelected(new Set());
  }, [search, paymentFilter]);

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
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
    if (!form.name.trim() || saving) return;
    setSaving(true);
    await addClient({
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
      loginUrl: form.loginUrl.trim(),
      loginEmail: form.loginEmail.trim(),
      password: form.password,
      accessNotes: form.accessNotes.trim(),
      service: form.service.trim(),
      totalAmount: Number(form.totalAmount) || 0,
      amountPaid: Number(form.amountPaid) || 0,
      balanceDue: (Number(form.totalAmount) || 0) - (Number(form.amountPaid) || 0),
      paymentStatus: form.paymentStatus,
      dueDate: form.dueDate.trim(),
      notes: form.notes.trim(),
    });
    setForm(emptyForm());
    setSaving(false);
    setAddOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this client?")) return;
    setDeleting(id);
    await deleteClient(id);
    setDeleting(null);
  }

  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/clients/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        setBulkDeleteOpen(false);
        fetchClients();
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
    }
    setBulkLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Manage Clients</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{clients.length} clients total</p>
        </div>
        <Button className="h-9 rounded-md gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/40"
          />
        </div>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-white px-3 text-[13px] outline-none focus:border-primary/40"
        >
          <option value="all">All Payment</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-[13px] font-semibold text-primary">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="h-8 text-[12px] text-red-600 border-red-200 hover:bg-red-50" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
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
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5">Client</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Service</th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">Total</th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">Paid</th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5">Balance</th>
                <th className="text-center text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Status</th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className={`border-b border-border last:border-0 transition-colors ${
                    selected.has(client.id) ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(client.id)}
                      onChange={() => toggleRow(client.id)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-muted text-[11px] font-medium text-foreground">{client.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link href={`/clients/${client.id}`} className="text-[13px] font-medium hover:text-primary truncate block">{client.name}</Link>
                        <p className="text-[11px] text-muted-foreground truncate">{client.company || client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{client.service || "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-right font-medium hidden sm:table-cell">₹{client.totalAmount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-[13px] text-emerald-600 font-medium text-right hidden sm:table-cell">₹{client.amountPaid.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-[13px] text-right font-medium">
                    <span className={client.balanceDue > 0 ? "text-red-600" : ""}>₹{client.balanceDue.toLocaleString("en-IN")}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${statusColors[client.paymentStatus]}`}>
                      {client.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="ghost" size="icon-sm"><Pencil className="h-3.5 w-3.5" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(client.id)} disabled={deleting === client.id} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-[13px] text-muted-foreground">No clients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={() => setAddOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>Add a new client to your CRM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client name" className="h-9 text-[13px]" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" className="h-9 text-[13px]" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="h-9 text-[13px]" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="h-9 text-[13px]" /></div>
              <div className="space-y-1.5"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." className="h-9 text-[13px]" /></div>
            </div>
            <div className="space-y-1.5"><Label>Service</Label><Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="e.g. GMB Management" className="h-9 text-[13px]" /></div>
            <div className="space-y-1.5"><Label>Login URL</Label><Input value={form.loginUrl} onChange={(e) => setForm({ ...form, loginUrl: e.target.value })} placeholder="https://..." className="h-9 text-[13px]" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Login Email</Label><Input value={form.loginEmail} onChange={(e) => setForm({ ...form, loginEmail: e.target.value })} placeholder="username" className="h-9 text-[13px]" /></div>
              <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••" className="h-9 text-[13px]" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Total (₹)</Label><Input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} placeholder="0" className="h-9 text-[13px]" /></div>
              <div className="space-y-1.5"><Label>Paid (₹)</Label><Input type="number" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} placeholder="0" className="h-9 text-[13px]" /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value as PaymentStatus })} className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none">
                  <option value="pending">Pending</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="space-y-1.5"><Label>Due Date</Label><Input value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} placeholder="DD-MM-YYYY" className="h-9 text-[13px]" /></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." rows={2} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-[13px] outline-none resize-none" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Save Client"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selected.size} clients?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>
              {bulkLoading ? "Deleting..." : `Delete ${selected.size} Clients`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
