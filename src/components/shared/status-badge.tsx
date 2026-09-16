"use client";

import { cn } from "cn";

type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  new: { label: "New", className: "bg-blue-50 text-blue-600" },
  not_connected: { label: "Not Connected", className: "bg-zinc-100 text-zinc-600" },
  processing: { label: "Processing", className: "bg-amber-50 text-amber-600" },
  hot_lead: { label: "Hot", className: "bg-red-50 text-red-600" },
  follow_up: { label: "Follow-up", className: "bg-violet-50 text-violet-600" },
  won: { label: "Won", className: "bg-emerald-50 text-emerald-600" },
  lost: { label: "Lost", className: "bg-zinc-100 text-zinc-500" },
  overdue: { label: "Overdue", className: "bg-orange-50 text-orange-600" },
  active: { label: "Active", className: "bg-emerald-50 text-emerald-600" },
  onboarding: { label: "Onboarding", className: "bg-blue-50 text-blue-600" },
  paused: { label: "Paused", className: "bg-amber-50 text-amber-600" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-600" },
  planning: { label: "Planning", className: "bg-zinc-100 text-zinc-600" },
  in_progress: { label: "In Progress", className: "bg-blue-50 text-blue-600" },
  review: { label: "Review", className: "bg-amber-50 text-amber-600" },
  on_hold: { label: "On Hold", className: "bg-zinc-100 text-zinc-500" },
  todo: { label: "To Do", className: "bg-zinc-100 text-zinc-600" },
  draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600" },
  sent: { label: "Sent", className: "bg-blue-50 text-blue-600" },
  viewed: { label: "Viewed", className: "bg-violet-50 text-violet-600" },
  accepted: { label: "Accepted", className: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-600" },
  expired: { label: "Expired", className: "bg-zinc-100 text-zinc-500" },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-600" },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-600" },
  partial: { label: "Partial", className: "bg-blue-50 text-blue-600" },
  negotiation: { label: "Negotiation", className: "bg-violet-50 text-violet-600" },
  connected: { label: "Connected", className: "bg-emerald-50 text-emerald-600" },
  busy: { label: "Busy", className: "bg-orange-50 text-orange-600" },
  interested: { label: "Interested", className: "bg-blue-50 text-blue-600" },
  not_interested: { label: "Not Interested", className: "bg-zinc-100 text-zinc-500" },
  callback_requested: { label: "Callback", className: "bg-violet-50 text-violet-600" },
  price: { label: "Price", className: "bg-amber-50 text-amber-600" },
  competitor: { label: "Competitor", className: "bg-red-50 text-red-600" },
  no_requirement: { label: "No Requirement", className: "bg-zinc-100 text-zinc-500" },
  wrong_lead: { label: "Wrong Lead", className: "bg-zinc-100 text-zinc-500" },
  other: { label: "Other", className: "bg-zinc-100 text-zinc-600" },
};

function formatStatusLabel(status: string): string {
  if (STATUS_MAP[status]) return STATUS_MAP[status].label;
  return status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/ /g, "_");
  const config = STATUS_MAP[normalized];
  const label = formatStatusLabel(normalized);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-medium leading-5",
        config?.className ?? "bg-zinc-100 text-zinc-600",
        className
      )}
    >
      {label}
    </span>
  );
}
