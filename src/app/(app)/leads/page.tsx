"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, X, FileSpreadsheet, ExternalLink } from "lucide-react";
import { LeadForm } from "@/components/crm/lead-form";
import type { LeadStatus } from "@/lib/types";

const ALL_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "not_connected", label: "Not Connected" },
  { value: "processing", label: "Processing" },
  { value: "follow_up", label: "Follow-up" },
  { value: "hot_lead", label: "Hot" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "overdue", label: "Overdue" },
];

const statusTabs = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
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
  onChange,
}: {
  leadId: string;
  currentStatus: string;
  onChange: (leadId: string, newStatus: LeadStatus) => void;
}) {
  const [value, setValue] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const userStr = localStorage.getItem("crm_user");
      const user = userStr ? JSON.parse(userStr) : {};
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id || "",
          "x-user-name": user.name || "",
          "x-user-email": user.email || "",
          "x-user-role": user.role || "",
          "x-org-id": user.organizationId || "",
        },
        body: JSON.stringify({ status: newStatus }),
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

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      onClick={(e) => e.stopPropagation()}
      className="h-7 rounded-md border border-border bg-white px-1.5 text-[12px] font-medium outline-none focus:border-primary/40 cursor-pointer disabled:opacity-50"
    >
      {ALL_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}

function SourceCell({ source, sourceUrl }: { source: string; sourceUrl?: string }) {
  if (sourceUrl && isValidHttpUrl(sourceUrl)) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[13px] text-primary hover:underline"
      >
        {source || "View Source"}
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }
  if (source) {
    return <span className="text-[13px] text-muted-foreground">{source}</span>;
  }
  return <span className="text-muted-foreground">&mdash;</span>;
}

export default function LeadsPage() {
  const { user, hasRole } = useAuth();
  const { leads, teamMembers, fetchLeads } = useCRMData();
  const isSales = user?.role === "SALES_PERSON";
  const canChangeStatus = user?.role === "FOUNDER" || user?.role === "ADMIN";

  const visibleLeads = isSales
    ? leads.filter((l) => l.assignedTo === user?.id || !l.assignedTo)
    : leads;

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredLeads = visibleLeads.filter((lead) => {
    if (activeTab !== "all" && lead.status !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        lead.requirement.toLowerCase().includes(s) ||
        lead.company.toLowerCase().includes(s) ||
        lead.phone.includes(s)
      );
    }
    return true;
  });

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    fetchLeads();
  };

  const totalLeads = visibleLeads.length;
  const newLeads = visibleLeads.filter((l) => l.status === "new").length;
  const followUps = visibleLeads.filter((l) => l.status === "follow_up").length;
  const hotLeads = visibleLeads.filter((l) => l.status === "hot_lead").length;
  const wonLeads = visibleLeads.filter((l) => l.status === "won").length;

  function handleStatClick(status: string) {
    setActiveTab(status);
  }

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
          <Link href="/import-export">
            <Button size="sm" variant="outline" className="gap-1.5 h-9">
              <FileSpreadsheet className="h-4 w-4" />
              Import
            </Button>
          </Link>
          <Button size="sm" className="gap-1.5 h-9" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <button
          onClick={() => handleStatClick("all")}
          className={`rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/30 ${
            activeTab === "all" ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total Leads</p>
          <p className="mt-1 text-[20px] font-semibold">{totalLeads}</p>
        </button>
        <button
          onClick={() => handleStatClick("new")}
          className={`rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/30 ${
            activeTab === "new" ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">New Leads</p>
          <p className="mt-1 text-[20px] font-semibold">{newLeads}</p>
        </button>
        <button
          onClick={() => handleStatClick("follow_up")}
          className={`rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/30 ${
            activeTab === "follow_up" ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Follow-ups</p>
          <p className="mt-1 text-[20px] font-semibold">{followUps}</p>
        </button>
        <button
          onClick={() => handleStatClick("hot_lead")}
          className={`rounded-lg border bg-white p-4 text-left transition-colors hover:border-primary/30 ${
            activeTab === "hot_lead" ? "border-primary/40 bg-primary/5" : "border-border"
          }`}
        >
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Hot Leads</p>
          <p className="mt-1 text-[20px] font-semibold">{hotLeads}</p>
        </button>
        <button
          onClick={() => handleStatClick("won")}
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
      <div className="flex gap-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-foreground text-white"
                : "text-muted-foreground hover:bg-muted"
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
                <th className="text-left text-[12px] font-medium text-muted-foreground px-5 py-3">Requirement</th>
                <th className="text-left text-[12px] font-medium text-muted-foreground px-5 py-3">Company</th>
                <th className="text-left text-[12px] font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Phone</th>
                <th className="text-left text-[12px] font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Source</th>
                <th className="text-left text-[12px] font-medium text-muted-foreground px-5 py-3">Status</th>
                {!isSales && (
                  <th className="text-left text-[12px] font-medium text-muted-foreground px-5 py-3 hidden xl:table-cell">Assigned To</th>
                )}
                <th className="text-left text-[12px] font-medium text-muted-foreground px-5 py-3 hidden xl:table-cell">Follow-up</th>
                <th className="text-right text-[12px] font-medium text-muted-foreground px-5 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/leads/${lead.id}`} className="text-[13px] font-medium hover:text-primary transition-colors">
                      {lead.requirement}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{lead.company}</td>
                  <td className="px-5 py-3.5 text-[13px] hidden lg:table-cell">{lead.phone}</td>
                  <td className="px-5 py-3.5 text-[13px] hidden lg:table-cell"><SourceCell source={lead.source} sourceUrl={lead.sourceUrl} /></td>
                  <td className="px-5 py-3.5">
                    {(canChangeStatus || lead.assignedTo === user?.id) ? (
                      <StatusSelect leadId={lead.id} currentStatus={lead.status} onChange={handleStatusChange} />
                    ) : (
                      <StatusBadge status={lead.status} />
                    )}
                  </td>
                  {!isSales && (
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground hidden xl:table-cell">
                      {lead.assignedToName ? (
                        lead.assignedToName
                      ) : (
                        <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Unassigned
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground hidden xl:table-cell">
                    {lead.nextFollowup
                      ? new Date(lead.nextFollowup).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {filteredLeads.map((lead) => (
          <Link
            key={lead.id}
            href={`/leads/${lead.id}`}
            className="block rounded-lg border border-border bg-white p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-medium">{lead.requirement}</p>
                <p className="text-[12px] text-muted-foreground">{lead.company}</p>
              </div>
              {(canChangeStatus || lead.assignedTo === user?.id) ? (
                <StatusSelect leadId={lead.id} currentStatus={lead.status} onChange={handleStatusChange} />
              ) : (
                <StatusBadge status={lead.status} />
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-foreground">
              <span>{lead.phone}</span>
              <SourceCell source={lead.source} sourceUrl={lead.sourceUrl} />
            </div>
          </Link>
        ))}
      </div>

      <p className="text-[13px] text-muted-foreground">
        {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
      </p>

      {/* Add Lead Modal */}
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
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
