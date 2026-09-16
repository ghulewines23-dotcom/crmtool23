"use client";

import { useState, useRef, useEffect } from "react";
import { useCRMData } from "@/lib/crm-data-context";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Search, ExternalLink } from "lucide-react";

function isValidHttpUrl(str: string): boolean {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getAuthHeaders(): Record<string, string> {
  return {};
}

const LEAD_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "new", label: "New" },
  { value: "not_connected", label: "Not Connected" },
  { value: "processing", label: "Processing" },
  { value: "follow_up", label: "Follow-up" },
  { value: "hot_lead", label: "Hot" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "overdue", label: "Overdue" },
];

export default function AdminLeadsPage() {
  const { leads, fetchLeads, teamMembers, fetchTeamMembers } = useCRMData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignFilter, setAssignFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  // Bulk modals
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkStatusValue, setBulkStatusValue] = useState("new");
  const [bulkAssignValue, setBulkAssignValue] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const headerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Clear selection on filter change
  useEffect(() => {
    setSelected(new Set());
  }, [search, statusFilter, assignFilter]);

  const unassignedCount = leads.filter((l) => !l.assignedTo).length;

  const filtered = leads.filter((lead) => {
    if (statusFilter !== "all" && lead.status !== statusFilter) return false;
    if (assignFilter === "unassigned" && lead.assignedTo) return false;
    if (assignFilter === "assigned" && !lead.assignedTo) return false;
    if (assignFilter !== "all" && assignFilter !== "unassigned" && assignFilter !== "assigned" && lead.assignedTo !== assignFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        lead.requirement.toLowerCase().includes(s) ||
        lead.company.toLowerCase().includes(s) ||
        lead.phone.includes(s) ||
        lead.name.toLowerCase().includes(s) ||
        (lead.assignedToName && lead.assignedToName.toLowerCase().includes(s))
      );
    }
    return true;
  });

  // Selection logic
  const allOnPageSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const someSelected = filtered.some((l) => selected.has(l.id));

  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.indeterminate = someSelected && !allOnPageSelected;
    }
  }, [someSelected, allOnPageSelected]);

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
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

  // Single delete
  async function handleDelete(id: string) {
    if (!confirm("Delete this lead?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
        setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
    setDeleting(null);
  }

  // Bulk delete
  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        setBulkDeleteOpen(false);
        fetchLeads();
      }
    } catch (error) {
      console.error("Bulk delete failed:", error);
    }
    setBulkLoading(false);
  }

  // Bulk status
  async function handleBulkStatus() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/leads/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ ids: [...selected], status: bulkStatusValue }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        setBulkStatusOpen(false);
        fetchLeads();
      }
    } catch (error) {
      console.error("Bulk status failed:", error);
    }
    setBulkLoading(false);
  }

  // Bulk assign
  async function handleBulkAssign() {
    setBulkLoading(true);
    try {
      const payload: { ids: string[]; assignedTo?: string } = { ids: [...selected] };
      if (bulkAssignValue) payload.assignedTo = bulkAssignValue;
      const res = await fetch("/api/leads/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        setBulkAssignOpen(false);
        fetchLeads();
      }
    } catch (error) {
      console.error("Bulk assign failed:", error);
    }
    setBulkLoading(false);
  }

  const activeSalespeople = teamMembers.filter(
    (m) => m.status === "active" && m.role !== "FOUNDER"
  );

  const selectedArray = [...selected];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[28px] font-semibold tracking-tight">Manage Leads</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{leads.length} leads total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search leads..."
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
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={assignFilter}
          onChange={(e) => setAssignFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-white px-3 text-[13px] outline-none focus:border-primary/40"
        >
          <option value="all">All Assignment</option>
          <option value="unassigned">Unassigned ({unassignedCount})</option>
          <option value="assigned">Assigned</option>
          {activeSalespeople.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
          <span className="text-[13px] font-semibold text-primary">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={() => setBulkStatusOpen(true)}>
            Change Status
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={() => setBulkAssignOpen(true)}>
            Assign To
          </Button>
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
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5">Requirement</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5">Company</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">Phone</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden lg:table-cell">Source</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5">Status</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 hidden xl:table-cell">Assigned</th>
                <th className="text-right text-[11px] font-medium text-muted-foreground px-4 py-2.5 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className={`border-b border-border last:border-0 transition-colors ${
                    selected.has(lead.id) ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleRow(lead.id)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-[13px] font-medium max-w-[250px] truncate">{lead.requirement}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{lead.company}</td>
                  <td className="px-4 py-3 text-[13px] hidden md:table-cell">{lead.phone}</td>
                  <td className="px-4 py-3 text-[13px] hidden lg:table-cell">
                    {lead.sourceUrl && isValidHttpUrl(lead.sourceUrl) ? (
                      <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        {lead.source || "View"}<ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{lead.source || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground hidden xl:table-cell">
                    {lead.assignedToName ? (
                      lead.assignedToName
                    ) : (
                      <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(lead.id)}
                      disabled={deleting === lead.id}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {selected.size} leads?</DialogTitle>
            <DialogDescription>This action cannot be undone. Selected leads will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>
              {bulkLoading ? "Deleting..." : `Delete ${selected.size} Leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change status for {selected.size} leads</DialogTitle>
            <DialogDescription>Select the new status for all selected leads.</DialogDescription>
          </DialogHeader>
          <select
            value={bulkStatusValue}
            onChange={(e) => setBulkStatusValue(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-white px-3 text-[13px] outline-none focus:border-primary/40"
          >
            {LEAD_STATUSES.filter((s) => s.value !== "all").map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusOpen(false)} disabled={bulkLoading}>Cancel</Button>
            <Button onClick={handleBulkStatus} disabled={bulkLoading}>
              {bulkLoading ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign {selected.size} leads</DialogTitle>
            <DialogDescription>Select a team member or unassign.</DialogDescription>
          </DialogHeader>
          {activeSalespeople.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No active salespeople available.</p>
          ) : (
            <select
              value={bulkAssignValue}
              onChange={(e) => setBulkAssignValue(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-white px-3 text-[13px] outline-none focus:border-primary/40"
            >
              <option value="">Unassign</option>
              {activeSalespeople.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignOpen(false)} disabled={bulkLoading}>Cancel</Button>
            <Button onClick={handleBulkAssign} disabled={bulkLoading || activeSalespeople.length === 0}>
              {bulkLoading ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
