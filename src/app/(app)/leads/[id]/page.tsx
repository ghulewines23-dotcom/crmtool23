"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, MessageCircle, Mail, Calendar, Pencil } from "lucide-react";
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

export default function LeadDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { leads, activityTimeline, fetchLeads } = useCRMData();
  const lead = leads.find((l) => l.id === params.id);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const canChangeStatus = user?.role === "FOUNDER" || user?.role === "ADMIN";
  const isAssigned = lead?.assignedTo === user?.id;

  async function handleStatusChange(newStatus: string) {
    if (!lead) return;
    setUpdatingStatus(true);
    try {
      const userStr = localStorage.getItem("crm_user");
      const userData = userStr ? JSON.parse(userStr) : {};
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userData.id || "",
          "x-user-name": userData.name || "",
          "x-user-email": userData.email || "",
          "x-user-role": userData.role || "",
          "x-org-id": userData.organizationId || "",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      }
    } catch (error) {
      console.error("Status update failed:", error);
    }
    setUpdatingStatus(false);
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[15px] text-muted-foreground">Lead not found</p>
        <Link href="/leads">
          <Button variant="ghost" size="sm" className="mt-3 gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Leads
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-[24px] font-semibold tracking-tight">{lead.requirement}</h1>
            {(canChangeStatus || isAssigned) ? (
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
                className="h-7 rounded-md border border-border bg-white px-2 text-[12px] font-medium outline-none focus:border-primary/40 cursor-pointer disabled:opacity-50"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            ) : (
              <StatusBadge status={lead.status} />
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{lead.company}</p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-[13px]">
            <Phone className="h-3.5 w-3.5" />
            Call
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-[13px]">
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-[13px]">
            <Mail className="h-3.5 w-3.5" />
            Email
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-[13px]">
            <Calendar className="h-3.5 w-3.5" />
            Follow-up
          </Button>
          <Button size="sm" className="gap-1.5 h-8 text-[13px]">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact & Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-border bg-white p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold">Contact</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Requirement</p>
                <p className="text-[13px] mt-0.5">{lead.requirement}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Phone</p>
                <p className="text-[13px] mt-0.5">{lead.phone}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Email</p>
                <p className="text-[13px] mt-0.5">{lead.email}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Company</p>
                <p className="text-[13px] mt-0.5">{lead.company}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Source</p>
                <p className="text-[13px] mt-0.5">{lead.source}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Status</p>
                <div className="mt-1">
                  {(canChangeStatus || isAssigned) ? (
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={updatingStatus}
                      className="h-7 rounded-md border border-border bg-white px-2 text-[12px] font-medium outline-none focus:border-primary/40 cursor-pointer disabled:opacity-50"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={lead.status} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Assigned To</p>
                <p className="text-[13px] mt-0.5">
                  {lead.assignedToName ? (
                    lead.assignedToName
                  ) : (
                    <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Unassigned
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Activity, Notes, Follow-up */}
        <div className="lg:col-span-2 space-y-4">
          {/* Next Follow-up */}
          {lead.nextFollowup && (
            <div className="rounded-lg border border-border bg-white p-5">
              <h3 className="font-display text-sm font-semibold mb-3">Next Follow-up</h3>
              <p className="text-[13px]">
                {new Date(lead.nextFollowup).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h3 className="font-display text-sm font-semibold mb-3">Notes</h3>
            <p className="text-[13px] text-muted-foreground">
              {lead.notes || "No notes yet."}
            </p>
          </div>

          {/* Activity */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h3 className="font-display text-sm font-semibold mb-4">Activity</h3>
            <div className="space-y-4">
              {activityTimeline.map((item, index) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative shrink-0">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                    {index < activityTimeline.length - 1 && (
                      <div className="absolute left-[3px] top-3.5 w-px h-full bg-border" />
                    )}
                  </div>
                  <div className="pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {item.date} · {item.time}
                      </span>
                      <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[13px] mt-0.5">{item.description}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">By {item.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
