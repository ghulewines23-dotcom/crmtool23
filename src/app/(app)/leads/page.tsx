"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  X,
  Phone,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  Clock,
  Edit2,
  Calendar,
  MessageSquare,
  MapPin,
  CheckSquare,
} from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/types";

const FILTER_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "not_connected", label: "Not Connected" },
  { value: "processing", label: "Processing" },
  { value: "hot_lead", label: "Hot Lead" },
  { value: "won", label: "Sold" },
  { value: "lost", label: "Lost" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => {
  const d = String(i + 1);
  return { label: d, value: d };
});

const MONTHS = [
  { label: "Jan", value: "0" },
  { label: "Feb", value: "1" },
  { label: "Mar", value: "2" },
  { label: "Apr", value: "3" },
  { label: "May", value: "4" },
  { label: "Jun", value: "5" },
  { label: "Jul", value: "6" },
  { label: "Aug", value: "7" },
  { label: "Sept", value: "8" },
  { label: "Oct", value: "9" },
  { label: "Nov", value: "10" },
  { label: "Dec", value: "11" },
];

const YEARS = [
  { label: "2025", value: "2025" },
  { label: "2026", value: "2026" },
  { label: "2027", value: "2027" },
  { label: "2028", value: "2028" },
  { label: "2029", value: "2029" },
  { label: "2030", value: "2030" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = String(i + 1);
  return { label: h, value: h };
});

const MINUTES = Array.from({ length: 60 }, (_, i) => {
  const m = String(i).padStart(2, "0");
  return { label: m, value: m };
});

const AMPM = [
  { label: "am", value: "am" },
  { label: "pm", value: "pm" },
];

// Smooth Scrollable Wheel Roller Column matching screenshot
function WheelColumn({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  const currentIndex = options.findIndex((o) => o.value === value);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const lastScrollTime = useRef(0);

  const goToPrev = useCallback(() => {
    const prev = options[(activeIdx - 1 + options.length) % options.length];
    onChange(prev.value);
  }, [activeIdx, options, onChange]);

  const goToNext = useCallback(() => {
    const next = options[(activeIdx + 1) % options.length];
    onChange(next.value);
  }, [activeIdx, options, onChange]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollTime.current < 80) return;
      lastScrollTime.current = now;
      if (e.deltaY > 0) goToNext();
      else goToPrev();
    },
    [goToNext, goToPrev]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 15) {
        if (diff > 0) goToNext();
        else goToPrev();
      }
    },
    [goToNext, goToPrev]
  );

  const prev = options[(activeIdx - 1 + options.length) % options.length];
  const curr = options[activeIdx];
  const next = options[(activeIdx + 1) % options.length];

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center select-none py-1 min-w-[48px] touch-none"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        onClick={goToPrev}
        className="text-[13px] font-normal text-zinc-400 hover:text-zinc-200 py-1 transition-colors"
      >
        {prev.label}
      </button>

      <div className="w-full border-y border-zinc-400/80 py-1.5 text-center my-1.5">
        <span className="text-[16px] font-semibold text-white tracking-wide">{curr.label}</span>
      </div>

      <button
        type="button"
        onClick={goToNext}
        className="text-[13px] font-normal text-zinc-400 hover:text-zinc-200 py-1 transition-colors"
      >
        {next.label}
      </button>
    </div>
  );
}

// Custom "Set date and time" Wheel Modal matching reference screenshot
function ScrollDateTimePickerModal({
  isOpen,
  initialDate,
  onClose,
  onSet,
  onClear,
}: {
  isOpen: boolean;
  initialDate?: string | null;
  onClose: () => void;
  onSet: (formattedDateTime: string) => void;
  onClear: () => void;
}) {
  const now = new Date();
  const [day, setDay] = useState(String(now.getDate()));
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState("2026");
  const [hour, setHour] = useState("7");
  const [minute, setMinute] = useState("02");
  const [ampmVal, setAmpmVal] = useState("pm");

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSet = () => {
    // Construct Date object
    let hInt = parseInt(hour, 10);
    if (ampmVal === "pm" && hInt < 12) hInt += 12;
    if (ampmVal === "am" && hInt === 12) hInt = 0;

    const dObj = new Date(parseInt(year, 10), parseInt(month, 10), parseInt(day, 10), hInt, parseInt(minute, 10));
    onSet(dObj.toISOString());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-hidden">
      <div className="bg-[#292c34] text-white rounded-[28px] p-6 shadow-2xl w-full max-w-sm border border-zinc-700/60 space-y-6">
        <div>
          <h3 className="text-xl font-normal text-white tracking-tight">Set date and time</h3>
        </div>

        {/* Roller Wheel Container matching screenshot */}
        <div className="space-y-6 py-2">
          {/* Date Wheels (Day, Month, Year) */}
          <div className="grid grid-cols-3 gap-2 items-center text-center">
            <WheelColumn options={DAYS} value={day} onChange={setDay} />
            <WheelColumn options={MONTHS} value={month} onChange={setMonth} />
            <WheelColumn options={YEARS} value={year} onChange={setYear} />
          </div>

          {/* Time Wheels (Hour, Minute, AM/PM) */}
          <div className="grid grid-cols-3 gap-2 items-center text-center">
            <WheelColumn options={HOURS} value={hour} onChange={setHour} />
            <div className="flex items-center justify-center">
              <WheelColumn options={MINUTES} value={minute} onChange={setMinute} />
            </div>
            <WheelColumn options={AMPM} value={ampmVal} onChange={setAmpmVal} />
          </div>
        </div>

        {/* Modal Footer Actions matching screenshot */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-700/40">
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="text-[14px] font-medium text-[#eab308] hover:text-yellow-400 transition-colors"
          >
            Clear
          </button>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onClose}
              className="text-[14px] font-medium text-[#eab308] hover:text-yellow-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSet}
              className="text-[14px] font-semibold text-[#eab308] hover:text-yellow-400 transition-colors"
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Lead Expanded Detail Content (Used in both Card View and Table View)
function LeadDetailExpandedContent({
  lead,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  lead: Lead;
  onStatusChange: (leadId: string, status: LeadStatus, followupDate?: string, notes?: string) => Promise<void>;
  onDelete: (leadId: string) => void;
  onEdit: (lead: Lead) => void;
}) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [followupNotes, setFollowupNotes] = useState(lead.notes || "");

  const handleStatusClick = async (status: LeadStatus) => {
    if (lead.status === status || updatingStatus) return;
    setUpdatingStatus(true);
    await onStatusChange(lead.id, status);
    setUpdatingStatus(false);
  };

  const handleSetDateTime = async (isoDateTimeStr: string) => {
    setUpdatingStatus(true);
    await onStatusChange(lead.id, lead.status, isoDateTimeStr, followupNotes);
    setUpdatingStatus(false);
  };

  const handleClearDateTime = async () => {
    setUpdatingStatus(true);
    await onStatusChange(lead.id, lead.status, "", followupNotes);
    setUpdatingStatus(false);
  };

  const handleNotesBlur = async () => {
    if (followupNotes !== (lead.notes || "")) {
      setUpdatingStatus(true);
      await onStatusChange(lead.id, lead.status, undefined, followupNotes);
      setUpdatingStatus(false);
    }
  };

  // Format arrival date & time
  const leadArrivalDate = lead.createdAt
    ? new Date(lead.createdAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Follow-up format text
  const followupText = lead.nextFollowup
    ? new Date(lead.nextFollowup).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mt-4 pt-4 border-t border-zinc-100 space-y-4 text-left">
      {/* Arrival date & Followup bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-[13px]">
        <div className="text-zinc-500">
          <span className="font-semibold text-zinc-700">Lead Received: </span>
          <span className="font-medium text-zinc-800">{leadArrivalDate || "Today"}</span>
        </div>

        {/* Scroll Date Time Picker Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDatePickerModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[12px] font-medium text-zinc-800 transition-colors cursor-pointer"
        >
          <Clock className="h-3.5 w-3.5 text-zinc-600" />
          <span>{followupText ? `Follow-up: ${followupText}` : "Set date & time"}</span>
        </button>
      </div>

      {/* Notes Input */}
      <div>
        <textarea
          value={followupNotes}
          onChange={(e) => setFollowupNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes..."
          rows={2}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-700 placeholder:text-zinc-400 outline-none resize-none focus:border-zinc-400 focus:bg-white transition-all"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Footer Bar Actions */}
      <div className="pt-2 flex items-center justify-between text-[13px] border-t border-zinc-100">
        <div className="flex items-center gap-4">
          {lead.phone ? (
            <>
              <a
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 font-bold text-zinc-900 hover:text-zinc-700 transition-colors"
              >
                <Phone className="h-4 w-4 text-zinc-700" />
                Call
              </a>
              <a
                href={`https://wa.me/${
                  lead.phone.replace(/[^0-9]/g, "").startsWith("91") || lead.phone.replace(/[^0-9]/g, "").length > 10
                    ? lead.phone.replace(/[^0-9]/g, "")
                    : "91" + lead.phone.replace(/[^0-9]/g, "")
                }?text=${encodeURIComponent("Hi, following up on your inquiry...")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                WhatsApp
              </a>
            </>
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(lead);
            }}
            className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(lead.id);
            }}
            className="inline-flex items-center gap-1 text-zinc-500 hover:text-rose-600 font-medium transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Scrollable Date Time Picker Modal */}
      <ScrollDateTimePickerModal
        isOpen={showDatePickerModal}
        initialDate={lead.nextFollowup}
        onClose={() => setShowDatePickerModal(false)}
        onSet={handleSetDateTime}
        onClear={handleClearDateTime}
      />
    </div>
  );
}

// Single Card Accordion Component matching clean grayscale design
function SingleLeadCard({
  lead,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  onDelete,
  onEdit,
  isSelected,
  onToggleSelect,
}: {
  lead: Lead;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (leadId: string, status: LeadStatus, followupDate?: string, notes?: string) => Promise<void>;
  onDelete: (leadId: string) => void;
  onEdit: (lead: Lead) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  // Subtitle info: Address only
  const subtitleInfo = lead.location || null;

  // Format arrival date (compact)
  const leadArrivalDate = lead.createdAt
    ? new Date(lead.createdAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const statusColors: Record<string, string> = {
    new: "bg-slate-100 text-slate-600 border-slate-200",
    not_connected: "bg-slate-100 text-slate-500 border-slate-200",
    processing: "bg-blue-50 text-blue-600 border-blue-200",
    follow_up: "bg-amber-50 text-amber-600 border-amber-200",
    hot_lead: "bg-orange-50 text-orange-600 border-orange-200",
    won: "bg-emerald-50 text-emerald-600 border-emerald-200",
    lost: "bg-red-50 text-red-500 border-red-200",
    overdue: "bg-red-50 text-red-500 border-red-200",
  };

  return (
    <div className={`rounded-xl border bg-white p-2.5 shadow-sm transition-all ${isSelected ? "border-blue-500 ring-1 ring-blue-100 bg-blue-50/30" : "border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>
      {/* Header Bar */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={onToggleExpand}>
        {onToggleSelect && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Checkbox
              checked={!!isSelected}
              onChange={() => onToggleSelect()}
            />
          </div>
        )}
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-[13px] text-slate-900 tracking-tight leading-snug truncate">
                {lead.company || lead.name || "Untitled"}
              </h3>
            </div>
            {subtitleInfo && (
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitleInfo}</p>
            )}
          </div>
          {/* Category badge — inline on mobile, centered in the header on PC */}
          <div className="flex sm:flex-1 justify-center">
            <span className="inline-flex items-center rounded-md bg-slate-900 text-white px-1.5 py-0.5 text-[9px] font-semibold tracking-wide shrink-0">
              {lead.category || "General"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {leadArrivalDate && (
            <span className="text-[10px] text-slate-400 font-medium hidden sm:block whitespace-nowrap">
              {leadArrivalDate}
            </span>
          )}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStatusOpen(!statusOpen);
              }}
              className={`text-[10px] font-semibold px-2 py-1 rounded-md border capitalize outline-none cursor-pointer flex items-center gap-1 transition-all ${statusColors[lead.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
            >
              {lead.status === "won" ? "Sold" : lead.status.replace("_", " ")}
              <ChevronDown className={`h-3 w-3 transition-transform ${statusOpen ? "rotate-180" : ""}`} />
            </button>
            {statusOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setStatusOpen(false); }} />
                <div className="absolute right-0 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-xl z-50 space-y-0.5">
                  {[
                    { value: "not_connected", label: "Not Connected" },
                    { value: "processing", label: "Processing" },
                    { value: "follow_up", label: "Follow-up" },
                    { value: "hot_lead", label: "Hot Lead" },
                    { value: "won", label: "Won" },
                    { value: "lost", label: "Lost" },
                    { value: "overdue", label: "Overdue" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(lead.id, s.value as LeadStatus);
                        setStatusOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all flex items-center justify-between ${
                        lead.status === s.value
                          ? "bg-slate-900 text-white"
                          : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span>{s.label}</span>
                      {lead.status === s.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Body Section (Expanded) */}
      {isExpanded && (
        <LeadDetailExpandedContent
          lead={lead}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      )}
    </div>
  );
}

export default function LeadsPage() {
  const { user } = useAuth();
  const { leads, fetchLeads, bulkDeleteLeads } = useCRMData();
  const isSales = user?.role === "SALES_PERSON";
  const canManage = user?.role === "FOUNDER" || user?.role === "ADMIN" || user?.role === "SERENE_OWNER";

  const [activeTab, setActiveTab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Single Card expansion (Only 1 card open at a time)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);

  // Bulk Selection State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Toggle card expansion (Only 1 card open at a time)
  const toggleExpand = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  // Status Counts
  const counts = {
    all: leads.length,
    overdue: leads.filter((l) => l.status === "overdue").length,
    not_connected: leads.filter((l) => l.status === "not_connected").length,
    processing: leads.filter((l) => l.status === "processing").length,
    hot_lead: leads.filter((l) => l.status === "hot_lead").length,
    won: leads.filter((l) => l.status === "won").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  // Dynamically extract all unique categories from leads
  const availableCategories = Array.from(
    new Set(
      leads
        .map((l) => (l.category || "General").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    if (activeTab !== "all" && lead.status !== activeTab) return false;
    if (
      selectedCategory !== "all" &&
      (lead.category || "General").trim().toLowerCase() !== selectedCategory.toLowerCase()
    ) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (lead.company || "").toLowerCase().includes(s) ||
        (lead.location || "").toLowerCase().includes(s) ||
        (lead.phone || "").includes(s) ||
        (lead.name || "").toLowerCase().includes(s) ||
        (lead.category || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Bulk Selection Handlers
  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredIds = filteredLeads.map((l) => l.id);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedLeadIds.has(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(allFilteredIds));
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await bulkDeleteLeads(Array.from(selectedLeadIds));
      setSelectedLeadIds(new Set());
      setConfirmBulkDelete(false);
      fetchLeads();
    } catch (err) {
      console.error("Bulk delete error:", err);
    }
    setBulkDeleting(false);
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus, followupDate?: string, notes?: string) => {
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (followupDate !== undefined) payload.nextFollowup = followupDate;
      if (notes !== undefined) payload.notes = notes;

      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      }
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    await bulkDeleteLeads([id]);
    fetchLeads();
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {isSales ? "My Leads" : "Leads"}
          </h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {isSales ? "Leads assigned to you." : "Manage and track your sales leads."}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {canManage && (
            <Button
              variant={isBulkMode ? "default" : "outline"}
              size="sm"
              className={`gap-1 h-8 rounded-lg text-[11px] font-semibold transition-all ${
                isBulkMode
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => {
                const nextMode = !isBulkMode;
                setIsBulkMode(nextMode);
                if (!nextMode) {
                  setSelectedLeadIds(new Set());
                }
              }}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {isBulkMode ? "Exit" : "Bulk"}
            </Button>
          )}

          {canManage && (
            <Button size="sm" className="gap-1 h-8 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[11px] shadow-sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Top Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
        {FILTER_TABS.map((tab) => {
          const count = counts[tab.value as keyof typeof counts] ?? 0;
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Category */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, category, area"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          />
        </div>

        <CustomSelect
          options={[
            { value: "all", label: "All Categories" },
            ...availableCategories.map((cat) => ({ value: cat, label: cat })),
          ]}
          value={selectedCategory}
          onChange={setSelectedCategory}
          className="shrink-0 min-w-[140px]"
        />
      </div>

      {/* Bulk Action Toolbar */}
      {canManage && isBulkMode && (
        <div className="flex items-center justify-between gap-2 bg-slate-900 text-white rounded-xl px-3 py-2 shadow-lg transition-all">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-[11px] font-semibold text-white transition-all cursor-pointer select-none">
              <Checkbox
                checked={isAllSelected}
                onChange={toggleSelectAll}
                label={`All (${filteredLeads.length})`}
                className="text-white [&_span]:text-white"
              />
            </div>

            {selectedLeadIds.size > 0 && (
              <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg">
                {selectedLeadIds.size} sel
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {selectedLeadIds.size > 0 && (
              <Button
                size="sm"
                className="h-7 rounded-lg gap-1 bg-red-500 text-white hover:bg-red-600 font-semibold text-[11px]"
                onClick={() => setConfirmBulkDelete(true)}
              >
                <Trash2 className="h-3 w-3" />
                Delete ({selectedLeadIds.size})
              </Button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsBulkMode(false);
                setSelectedLeadIds(new Set());
              }}
              className="px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-2">
        {filteredLeads.map((lead, index) => {
          const isExpanded = expandedCardId === lead.id || (index === 0 && expandedCardId === null);

          return (
            <SingleLeadCard
              key={lead.id}
              lead={lead}
              isExpanded={isExpanded}
              isSelected={selectedLeadIds.has(lead.id)}
              onToggleSelect={isBulkMode ? () => toggleSelectLead(lead.id) : undefined}
              onToggleExpand={() => toggleExpand(lead.id)}
              onStatusChange={handleStatusChange}
              onDelete={(id) => setConfirmDeleteId(id)}
              onEdit={(leadItem) => setSelectedLeadForDetail(leadItem)}
            />
          );
        })}

        {filteredLeads.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center bg-white">
            <p className="text-[13px] font-medium text-slate-400">No leads found.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl w-full max-w-sm space-y-4">
            <h3 className="text-[16px] font-bold text-zinc-900">Delete Lead?</h3>
            <p className="text-[13px] text-zinc-500">Are you sure you want to delete this lead? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl h-9 bg-rose-600 text-white hover:bg-rose-700"
                onClick={async () => {
                  await handleDeleteLead(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl w-full max-w-sm space-y-4">
            <h3 className="text-[16px] font-bold text-zinc-900">Delete {selectedLeadIds.size} Selected Leads?</h3>
            <p className="text-[13px] text-zinc-500">
              Are you sure you want to delete these {selectedLeadIds.size} leads? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setConfirmBulkDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={bulkDeleting}
                className="rounded-xl h-9 bg-rose-600 text-white hover:bg-rose-700"
                onClick={handleExecuteBulkDelete}
              >
                {bulkDeleting ? "Deleting..." : `Delete ${selectedLeadIds.size} Leads`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}

      {/* Lead Detail / Edit Modal */}
      {selectedLeadForDetail && (
        <LeadEditModal
          lead={selectedLeadForDetail}
          onClose={() => setSelectedLeadForDetail(null)}
          onSaved={() => fetchLeads()}
        />
      )}
    </div>
  );
}

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { teamMembers, fetchLeads } = useCRMData();
  const [formData, setFormData] = useState({
    requirement: "",
    company: "",
    category: "",
    phone: "",
    email: "",
    name: "",
    source: "Phone",
    status: "not_connected" as LeadStatus,
    location: "",
    assignedTo: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.company) return;
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          requirement: formData.requirement || formData.company,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
        onClose();
      }
    } catch (err) {
      console.error("Error creating lead:", err);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-bold text-zinc-900">Add New Lead</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-zinc-800 mb-1">Business Name / Company *</label>
            <input
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="h-10 w-full rounded-xl border border-zinc-200 px-3.5 text-[13px] outline-none focus:border-zinc-900"
              placeholder="e.g. Elan Skin & Hair Clinic"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-zinc-800 mb-1">Business Category</label>
            <input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="h-10 w-full rounded-xl border border-zinc-200 px-3.5 text-[13px] outline-none focus:border-zinc-900"
              placeholder="e.g. Clinic, Real Estate, Institute, Gym..."
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-zinc-800 mb-1">Phone Number *</label>
            <input
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="h-10 w-full rounded-xl border border-zinc-200 px-3.5 text-[13px] outline-none focus:border-zinc-900"
              placeholder="e.g. 114144 0402"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-zinc-800 mb-1">Location / Area</label>
            <input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="h-10 w-full rounded-xl border border-zinc-200 px-3.5 text-[13px] outline-none focus:border-zinc-900"
              placeholder="e.g. Karol Bagh"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-zinc-800 mb-1">Status</label>
              <CustomSelect
                options={[
                  { value: "not_connected", label: "Not Connected" },
                  { value: "processing", label: "Processing" },
                  { value: "hot_lead", label: "Hot Lead" },
                  { value: "won", label: "Sold" },
                  { value: "lost", label: "Lost" },
                ]}
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val as LeadStatus })}
                className="w-full"
                size="sm"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-zinc-800 mb-1">Assigned To</label>
              <CustomSelect
                options={[
                  { value: "", label: "Unassigned" },
                  ...teamMembers.map((m) => ({ value: m.id, label: m.name })),
                ]}
                value={formData.assignedTo}
                onChange={(val) => setFormData({ ...formData, assignedTo: val })}
                className="w-full"
                size="sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <Button type="button" variant="outline" className="rounded-xl h-10" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl h-10 bg-zinc-900 text-white hover:bg-zinc-800">
              {saving ? "Saving..." : "Save Lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadEditModal({ lead, onClose, onSaved }: { lead: Lead; onClose: () => void; onSaved: () => void }) {
  const [company, setCompany] = useState(lead.company || "");
  const [category, setCategory] = useState(lead.category || "");
  const [phone, setPhone] = useState(lead.phone || "");
  const [location, setLocation] = useState(lead.location || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, category, phone, location }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
        onClose();
      }
    } catch (err) {
      console.error("Failed to update lead:", err);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xl w-full max-w-md space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h3 className="text-[16px] font-bold text-zinc-900">Edit Lead Details</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Business Name</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-[13px] outline-none focus:border-zinc-900"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Business Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-[13px] outline-none focus:border-zinc-900"
              placeholder="e.g. Clinic, Real Estate, Institute, Gym..."
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-[13px] outline-none focus:border-zinc-900"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Location / Area</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-[13px] outline-none focus:border-zinc-900"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving}
            className="rounded-xl h-9 bg-zinc-900 text-white hover:bg-zinc-800"
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
