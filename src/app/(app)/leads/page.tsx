"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, X, ExternalLink, Phone, Trash2 } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/types";

const ALL_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "not_connected", label: "Not Connected" },
  { value: "follow_up", label: "Follow-up" },
  { value: "hot_lead", label: "Hot" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const statusTabs = [
  { label: "All", value: "all" },
  { label: "Not Connected", value: "not_connected" },
  { label: "Follow-up", value: "follow_up" },
  { label: "Hot", value: "hot_lead" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
];

function isValidHttpUrl(str: string): boolean {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function StatusSelect({
  leadId,
  currentStatus,
  currentFollowup,
  onChange,
}: {
  leadId: string;
  currentStatus: string;
  currentFollowup?: Date | string | null;
  onChange: (leadId: string, newStatus: LeadStatus) => void;
}) {
  const [value, setValue] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupDateTime, setFollowupDateTime] = useState("");

  const updateStatusApi = async (newStatus: string, followupDate?: string) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (followupDate) {
        payload.nextFollowup = followupDate;
      }
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setValue(newStatus);
        onChange(leadId, newStatus as LeadStatus);
      }
    } catch (error) {
      console.error("Status update failed:", error);
    }
    setSaving(false);
  };

  const handleChange = async (newStatus: string) => {
    if (newStatus === "follow_up") {
      setShowFollowupModal(true);
    } else {
      await updateStatusApi(newStatus);
    }
  };

  const handleConfirmFollowup = async () => {
    if (!followupDateTime) return;
    setShowFollowupModal(false);
    await updateStatusApi("follow_up", followupDateTime);
  };

  return (
    <>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        onClick={(e) => e.stopPropagation()}
        className="h-7 rounded-md border border-border bg-white px-2 text-[12px] font-medium outline-none focus:border-primary/40 cursor-pointer disabled:opacity-50"
      >
        {ALL_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {showFollowupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { e.stopPropagation(); setShowFollowupModal(false); }}
        >
          <div
            className="bg-white rounded-xl border border-border p-5 shadow-xl w-full max-w-xs space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Schedule Follow-up</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Select date & time for follow-up</p>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={followupDateTime}
                onChange={(e) => setFollowupDateTime(e.target.value)}
                className="w-full h-9 rounded-lg border border-border px-3 text-[13px] outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => setShowFollowupModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-[12px] bg-primary text-white"
                disabled={!followupDateTime || saving}
                onClick={handleConfirmFollowup}
              >
                Set Follow-up
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SourceCell({ source, sourceUrl }: { source: string; sourceUrl?: string }) {
  if (sourceUrl && isValidHttpUrl(sourceUrl)) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 text-[12px] text-primary font-medium hover:underline"
      >
        {source || "Source"}
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }
  if (source) {
    return <span className="text-[12px] text-muted-foreground">{source}</span>;
  }
  return <span className="text-muted-foreground">&mdash;</span>;
}

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { leads, fetchLeads, bulkDeleteLeads } = useCRMData();
  const isSales = user?.role === "SALES_PERSON";
  const canManage = user?.role === "FOUNDER" || user?.role === "ADMIN" || user?.role === "SERENE_OWNER";
  const canChangeStatus = true; // everyone can change status

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);

  const filteredLeads = leads.filter((lead) => {
    if (activeTab !== "all" && lead.status !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (lead.requirement || "").toLowerCase().includes(s) ||
        (lead.company || "").toLowerCase().includes(s) ||
        (lead.phone || "").includes(s) ||
        (lead.name || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleStatusChange = (_leadId: string, _newStatus: LeadStatus) => {
    fetchLeads();
  };

  const totalLeads = leads.length;
  const notConnectedLeads = leads.filter((l) => l.status === "not_connected").length;
  const followUps = leads.filter((l) => l.status === "follow_up").length;
  const hotLeads = leads.filter((l) => l.status === "hot_lead").length;
  const wonLeads = leads.filter((l) => l.status === "won").length;

  // Selection
  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selected.has(l.id));
  const someSelected = filteredLeads.some((l) => selected.has(l.id));

  const toggleAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredLeads.map((l) => l.id)));
    }
  }, [allFilteredSelected, filteredLeads]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    await bulkDeleteLeads(Array.from(selected));
    setSelected(new Set());
    setDeleting(false);
    setConfirmDelete(false);
    fetchLeads();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">
            {isSales ? "My Leads" : "Leads"}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {isSales ? "Leads assigned to you." : "Manage and track your sales leads."}
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && selected.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 h-9"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selected.size})
            </Button>
          )}
          {canManage && (
            <Button size="sm" className="gap-1.5 h-9" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/30 ${
            activeTab === "all" ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total Leads</p>
          <p className="mt-1 text-[20px] font-semibold">{totalLeads}</p>
        </button>
        <button
          onClick={() => setActiveTab("not_connected")}
          className={`rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/30 ${
            activeTab === "not_connected" ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Not Connected</p>
          <p className="mt-1 text-[20px] font-semibold">{notConnectedLeads}</p>
        </button>
        <button
          onClick={() => setActiveTab("follow_up")}
          className={`rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/30 ${
            activeTab === "follow_up" ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Follow-ups</p>
          <p className="mt-1 text-[20px] font-semibold">{followUps}</p>
        </button>
        <button
          onClick={() => setActiveTab("hot_lead")}
          className={`rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/30 ${
            activeTab === "hot_lead" ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Hot Leads</p>
          <p className="mt-1 text-[20px] font-semibold">{hotLeads}</p>
        </button>
        <button
          onClick={() => setActiveTab("won")}
          className={`rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/30 ${
            activeTab === "won" ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Won Leads</p>
          <p className="mt-1 text-[20px] font-semibold">{wonLeads}</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Search by requirement, phone or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-lg border border-border bg-white pl-3 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
        />
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap shrink-0 transition-all ${
              activeTab === tab.value
                ? "bg-foreground text-background shadow-sm font-semibold"
                : "text-muted-foreground hover:bg-muted bg-muted/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {canManage && (
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allFilteredSelected; }}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-emerald-600 cursor-pointer"
                    />
                  </th>
                )}
                <th className="text-left text-[12px] font-medium text-muted-foreground px-4 py-3">Business Name</th>
                <th className="text-left text-[12px] font-medium text-muted-foreground px-4 py-3">Number</th>
                <th className="text-left text-[12px] font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Source</th>
                <th className="text-left text-[12px] font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-[12px] font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Assigned To</th>
                <th className="text-left text-[12px] font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Follow-up</th>
                <th className="text-right text-[12px] font-medium text-muted-foreground px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className={`border-b border-border last:border-0 transition-colors ${
                  selected.has(lead.id) ? "bg-primary/5" : "hover:bg-muted/30"
                }`}>
                  {canManage && (
                    <td className="w-10 px-3 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 accent-emerald-600 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => setSelectedLeadForDetail(lead)}
                      className="text-left text-[13px] font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      {lead.company || lead.name || "Untitled Business"}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-foreground font-mono">{lead.phone || "—"}</td>
                  <td className="px-4 py-3.5 text-[13px] hidden sm:table-cell"><SourceCell source={lead.source} sourceUrl={lead.sourceUrl} /></td>
                  <td className="px-4 py-3.5">
                    <StatusSelect leadId={lead.id} currentStatus={lead.status} currentFollowup={lead.nextFollowup} onChange={handleStatusChange} />
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-muted-foreground hidden xl:table-cell">
                    {lead.assignedToName ? (
                      lead.assignedToName
                    ) : (
                      <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-muted-foreground hidden xl:table-cell">
                    {lead.nextFollowup
                      ? new Date(lead.nextFollowup).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <a
                      href={`tel:${lead.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Call Now"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards — Clean & Minimal UI/UX */}
      <div className="md:hidden space-y-2.5">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedLeadForDetail(lead)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedLeadForDetail(lead); }}
            className="block rounded-xl border border-border bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                {canManage && (
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleOne(lead.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-4 w-4 rounded border-gray-300 accent-emerald-600 cursor-pointer shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold text-foreground truncate">
                    {lead.company || lead.name || "Untitled Business"}
                  </h3>
                  {lead.phone && (
                    <p className="text-[12px] font-mono text-muted-foreground mt-0.5">
                      {lead.phone}
                    </p>
                  )}
                </div>
              </div>
              <StatusSelect leadId={lead.id} currentStatus={lead.status} currentFollowup={lead.nextFollowup} onChange={handleStatusChange} />
            </div>

            <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2 flex-wrap">
                <SourceCell source={lead.source} sourceUrl={lead.sourceUrl} />
                {lead.nextFollowup && (
                  <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Follow-up: {new Date(lead.nextFollowup).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              
              <a
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium text-[12px] hover:bg-emerald-700 active:scale-95 transition-all shrink-0"
              >
                <Phone className="h-3.5 w-3.5" />
                Call Now
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[13px] text-muted-foreground">
        {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
        {selected.size > 0 && ` · ${selected.size} selected`}
      </p>

      {/* Bulk Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-white rounded-lg border border-border shadow-lg w-full max-w-sm mx-4 p-5">
            <h3 className="text-[15px] font-semibold">Delete {selected.size} lead{selected.size !== 1 ? "s" : ""}?</h3>
            <p className="mt-2 text-[13px] text-muted-foreground">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3 mt-5">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}

      {/* Excel Sheet Detail Modal */}
      {selectedLeadForDetail && (
        <ExcelLeadDetailModal
          lead={selectedLeadForDetail}
          onClose={() => setSelectedLeadForDetail(null)}
        />
      )}
    </div>
  );
}

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { teamMembers } = useCRMData();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg border border-border shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Add New Lead</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">Requirement *</label>
            <textarea
              className="h-20 w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40 resize-none"
              placeholder="What does the customer need?"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">Company *</label>
            <input
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="Company name"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">Phone *</label>
            <input
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">Email</label>
            <input
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">Full Name</label>
            <input
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="Contact person name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-foreground mb-1">Lead Source</label>
              <select className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary/40">
                <option>Select</option>
                <option>Google</option>
                <option>Facebook</option>
                <option>Referral</option>
                <option>Website</option>
                <option>LinkedIn</option>
                <option>Cold Call</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-foreground mb-1">Status</label>
              <select className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary/40">
                <option>New</option>
                <option>Follow-up</option>
                <option>Hot Lead</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">Source URL</label>
            <input
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">Location</label>
            <input
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40"
              placeholder="City, Area"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1">Assigned To</label>
            <select className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary/40">
              <option>Select team member</option>
              {teamMembers.map((m) => (
                <option key={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
          <Button variant="outline" size="sm" className="h-9" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-9">Save Lead</Button>
        </div>
      </div>
    </div>
  );
}

function ExcelLeadDetailModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const rawData = lead.rawExcelData && Object.keys(lead.rawExcelData).length > 0
    ? lead.rawExcelData
    : {
        "Business Name / Requirement": lead.company || lead.requirement || lead.name,
        "Phone Number": lead.phone,
        "Email": lead.email || "—",
        "Source": lead.source || "—",
        "Source URL": lead.sourceUrl || "—",
        "Status": lead.status,
        "Assigned To": lead.assignedToName || "Unassigned",
        "Location": lead.location || "—",
        "Notes": lead.notes || "—",
      };

  const entries = Object.entries(rawData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                Excel Sheet Data
              </span>
              <span className="text-[11px] text-muted-foreground">ID: {lead.id}</span>
            </div>
            <h2 className="text-lg font-bold text-foreground mt-1">
              {lead.company || lead.name || "Lead Details"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Excel Data Grid View */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="rounded-lg border border-border bg-white overflow-hidden shadow-sm">
            <div className="bg-[#F8F9FA] px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[12px] font-medium text-muted-foreground font-mono">
                Imported Row Columns ({entries.length})
              </span>
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
              >
                <Phone className="h-3 w-3" /> Call {lead.phone}
              </a>
            </div>

            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 font-semibold text-muted-foreground w-1/3 border-r border-border bg-muted/20 font-mono text-[12px]">
                    Excel Column
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-muted-foreground font-mono text-[12px]">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map(([key, val]) => (
                  <tr key={key} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground capitalize border-r border-border bg-muted/5 font-mono text-[12px]">
                      {key.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-sans">
                      {val !== undefined && val !== null && val !== "" ? (
                        String(val)
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-6 py-3 bg-muted/10">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Sheet View
          </Button>
        </div>
      </div>
    </div>
  );
}
