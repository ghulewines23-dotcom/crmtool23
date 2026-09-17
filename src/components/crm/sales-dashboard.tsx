"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import type { ComponentType, ReactNode } from "react";
import type { Lead, Priority } from "@/lib/types";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleX,
  Clock,
  Crown,
  Globe,
  Handshake,
  Inbox,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";

const DAY_MS = 24 * 60 * 60 * 1000;

type RangeKey = "today" | "7d" | "30d" | "90d" | "all";

const RANGE_OPTIONS: { value: RangeKey; short: string; label: string; days: number | null }[] = [
  { value: "today", short: "Today", label: "Today", days: 1 },
  { value: "7d", short: "7D", label: "Last 7 days", days: 7 },
  { value: "30d", short: "30D", label: "Last 30 days", days: 30 },
  { value: "90d", short: "90D", label: "Last 90 days", days: 90 },
  { value: "all", short: "All", label: "All time", days: null },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(amount: number): string {
  if (!amount) return "₹0";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function parseTime(value?: string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return isNaN(t) ? 0 : t;
}

function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getRangeStart(range: RangeKey): Date | null {
  if (range === "all") return null;
  const days = RANGE_OPTIONS.find((r) => r.value === range)?.days ?? 1;
  return new Date(startOfDay().getTime() - (days - 1) * DAY_MS);
}

function sameDayKey(value?: string | null): string {
  const t = value ? new Date(value).getTime() : NaN;
  if (isNaN(t)) return "";
  return new Date(t).toDateString();
}

function formatFollowupTime(value?: string | null): string {
  const t = parseTime(value);
  if (!t) return "";
  return new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getInitials(name?: string | null): string {
  return (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "SERENE_OWNER":
      return "Owner";
    case "FOUNDER":
      return "Founder";
    case "ADMIN":
      return "Admin";
    case "SALES_PERSON":
      return "Sales";
    default:
      return role;
  }
}

const PIPELINE_STAGES: { key: string; label: string; statuses: string[]; bar: string; dot: string }[] = [
  { key: "not_connected", label: "Not Connected", statuses: ["not_connected"], bar: "bg-slate-300", dot: "bg-slate-400" },
  { key: "contacted", label: "Contacted", statuses: ["new", "processing"], bar: "bg-slate-400", dot: "bg-slate-500" },
  { key: "followup", label: "Follow-up", statuses: ["follow_up", "overdue"], bar: "bg-amber-400", dot: "bg-amber-500" },
  { key: "hot", label: "Hot Leads", statuses: ["hot_lead"], bar: "bg-blue-600", dot: "bg-blue-600" },
  { key: "won", label: "Won", statuses: ["won"], bar: "bg-emerald-600", dot: "bg-emerald-600" },
  { key: "lost", label: "Lost", statuses: ["lost"], bar: "bg-slate-200", dot: "bg-slate-300" },
];

const SOURCE_META: {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  bar: string;
  chip: string;
}[] = [
  { key: "google", label: "Google", icon: Target, bar: "bg-blue-600", chip: "bg-blue-50 text-blue-600" },
  { key: "meta", label: "Meta", icon: Share2, bar: "bg-slate-500", chip: "bg-slate-100 text-slate-500" },
  { key: "website", label: "Website", icon: Globe, bar: "bg-slate-400", chip: "bg-slate-100 text-slate-500" },
  { key: "referral", label: "Referral", icon: Handshake, bar: "bg-slate-300", chip: "bg-slate-100 text-slate-500" },
  { key: "other", label: "Other", icon: Sparkles, bar: "bg-slate-200", chip: "bg-slate-100 text-slate-400" },
];

function sourceBucket(source?: string): string {
  const s = (source || "").toLowerCase();
  if (s.includes("google") || s.includes("ads")) return "google";
  if (s.includes("meta") || s.includes("facebook") || s.includes("instagram") || s.includes("fb")) return "meta";
  if (s.includes("website") || s.includes("web") || s.includes("site") || s.includes("online")) return "website";
  if (s.includes("refer") || s.includes("word of mouth") || s.includes("reference") || s.includes("client")) return "referral";
  return "other";
}

const PRIORITY_DOT: Record<Priority, string> = {
  urgent: "bg-rose-500",
  high: "bg-amber-500",
  medium: "bg-slate-300",
  low: "bg-slate-200",
};

function SectionCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-slate-400">{icon}</span>
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold leading-tight text-slate-900">{title}</h2>
          {subtitle && <p className="truncate text-[11px] leading-tight text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

function ViewAllLink({ href, children = "View all" }: { href: string; children?: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
    >
      {children}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

function AvatarInitials({
  name,
  className,
  tone = "bg-slate-100 text-slate-600",
}: {
  name?: string | null;
  className?: string;
  tone?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold tracking-wide",
        tone,
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}

function SubCount({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 tabular-nums">
      {children}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} />;
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="mt-2 h-5 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3 xl:col-span-3">
          <Skeleton className="h-4 w-28" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 xl:col-span-2">
          <Skeleton className="h-4 w-32" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <Skeleton className="h-4 w-28" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-3/6" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function SalesDashboard() {
  const { user } = useAuth();
  const { leads, teamMembers, fetchLeads, fetchTasks, fetchTeamMembers } = useCRMData();

  const [range, setRange] = useState<RangeKey>("30d");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "refreshing">("loading");

  const isOwnerOrAdmin =
    user?.role === "SERENE_OWNER" || user?.role === "FOUNDER" || user?.role === "ADMIN";

  const refreshData = useCallback(async () => {
    setStatus((s) => (s === "ready" ? "refreshing" : "loading"));
    await Promise.allSettled([fetchLeads(), fetchTasks(), fetchTeamMembers()]);
    await new Promise((r) => setTimeout(r, 350));
    setStatus("ready");
  }, [fetchLeads, fetchTasks, fetchTeamMembers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshData();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshData]);

  const salesTeam = useMemo(
    () =>
      teamMembers.filter(
        (m) =>
          m.status === "active" &&
          m.role !== "ADMIN" &&
          m.role !== "FOUNDER" &&
          m.role !== "SERENE_OWNER" &&
          (m.role === "SALES_PERSON" || m.secondaryRole === "SALES_PERSON" || m.isSalesEligible === true)
      ),
    [teamMembers]
  );

  const currentAgentId = isOwnerOrAdmin ? teamFilter : user?.id || "all";

  const scopeLeads = useMemo(() => {
    if (currentAgentId === "all") return leads;
    return leads.filter((l) => l.assignedTo === currentAgentId);
  }, [leads, currentAgentId]);

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label ?? "All time";
  const startMs = getRangeStart(range)?.getTime() ?? null;

  const isInCurrentPeriod = useCallback((t: number) => startMs === null || t >= startMs, [startMs]);

  const metrics = useMemo(() => {
    const pipelineTotal = scopeLeads.length;
    const currentLeads = scopeLeads.filter((l) => isInCurrentPeriod(parseTime(l.createdAt)));

    const wonLeads = currentLeads.filter((l) => l.status === "won");
    const wonCount = wonLeads.length;
    const wonRevenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    const conversionPct = currentLeads.length > 0 ? (wonCount / currentLeads.length) * 100 : 0;

    const lostLeads = currentLeads.filter((l) => l.status === "lost");

    const todayKey = new Date().toDateString();
    const openPipeline = scopeLeads.filter((l) => l.status !== "won" && l.status !== "lost");
    const followUpsToday = openPipeline.filter((l) => sameDayKey(l.nextFollowup) === todayKey);
    const overdue = openPipeline.filter(
      (l) => parseTime(l.nextFollowup) > 0 && parseTime(l.nextFollowup) < startOfDay().getTime()
    );

    return {
      pipelineTotal,
      currentLeads,
      currentCount: currentLeads.length,
      wonCount,
      wonRevenue,
      conversionPct,
      lostCount: lostLeads.length,
      lostPct: currentLeads.length > 0 ? (lostLeads.length / currentLeads.length) * 100 : 0,
      followUpsToday,
      overdue,
      openPipeline,
      openPipelineCount: openPipeline.length,
    };
  }, [scopeLeads, isInCurrentPeriod]);

  const funnel = useMemo(() => {
    const total = metrics.currentLeads.length;
    const stages = PIPELINE_STAGES.map((stage) => {
      const count = metrics.currentLeads.filter((l) => stage.statuses.includes(l.status)).length;
      return { ...stage, count };
    });
    const maxCount = Math.max(...stages.map((s) => s.count), 0);
    return { total, stages, maxCount };
  }, [metrics.currentLeads]);

  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of metrics.currentLeads) {
      const key = sourceBucket(lead.source);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return SOURCE_META.map((meta) => ({
      ...meta,
      count: counts.get(meta.key) || 0,
      pct: metrics.currentLeads.length > 0 ? ((counts.get(meta.key) || 0) / metrics.currentLeads.length) * 100 : 0,
    }));
  }, [metrics.currentLeads]);

  const teamPerformance = useMemo(
    () =>
      salesTeam.map((m) => {
        const memberLeads = metrics.currentLeads.filter((l) => l.assignedTo === m.id);
        const won = memberLeads.filter((l) => l.status === "won").length;
        const followups = metrics.followUpsToday.filter((l) => l.assignedTo === m.id).length;
        const conversion = memberLeads.length > 0 ? (won / memberLeads.length) * 100 : 0;
        return {
          id: m.id,
          name: m.name,
          role: m.role,
          leads: memberLeads.length,
          won,
          followups,
          conversion,
        };
      }),
    [salesTeam, metrics.currentLeads, metrics.followUpsToday]
  );

  const activityEvents = useMemo(() => {
    type EventType = "created" | "converted" | "lost";
    const list: { id: string; lead: Lead; type: EventType; time: number }[] = [];
    for (const lead of metrics.currentLeads) {
      const created = parseTime(lead.createdAt);
      const last = parseTime(lead.lastActivity);
      if (created > 0) list.push({ id: `created-${lead.id}`, lead, type: "created", time: created });
      if (lead.status === "won") {
        list.push({ id: `won-${lead.id}`, lead, type: "converted", time: Math.max(last, created) });
      } else if (lead.status === "lost") {
        list.push({ id: `lost-${lead.id}`, lead, type: "lost", time: Math.max(last, created) });
      }
    }
    return list.sort((a, b) => b.time - a.time).slice(0, 6);
  }, [metrics.currentLeads]);

  const followUpsList = useMemo(
    () => [...metrics.followUpsToday].sort((a, b) => parseTime(a.nextFollowup) - parseTime(b.nextFollowup)),
    [metrics.followUpsToday]
  );

  const selectedAgentName =
    teamFilter === "all" ? "All Team" : salesTeam.find((a) => a.id === teamFilter)?.name || "All Team";

  const isLoadingSkeleton = status === "loading";

  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const ACTIVITY_META = {
    created: { label: "Lead created", icon: UserPlus, tint: "bg-slate-100 text-slate-500" },
    converted: { label: "Lead converted", icon: Trophy, tint: "bg-emerald-50 text-emerald-600" },
    lost: { label: "Lead marked lost", icon: CircleX, tint: "bg-rose-50 text-rose-600" },
  } as const;

  const roleMeta =
    user?.role === "SERENE_OWNER" || user?.role === "FOUNDER"
      ? { icon: Crown, label: user?.role === "SERENE_OWNER" ? "Owner" : "Founder" }
      : user?.role === "ADMIN"
        ? { icon: ShieldCheck, label: "Admin" }
        : { icon: Briefcase, label: "Sales" };

  const kpis = [
    {
      key: "total",
      label: "Total Leads",
      value: metrics.pipelineTotal.toLocaleString("en-IN"),
      icon: <Users className="h-3.5 w-3.5" />,
      iconTone: "bg-slate-100 text-slate-500",
      meta: (
        <p className="truncate text-[11px] text-slate-400">
          <span className="font-semibold text-slate-600">+{metrics.currentCount}</span>{" "}
          {range === "all" ? "all time" : `this ${rangeLabel.toLowerCase()}`}
        </p>
      ),
    },
    {
      key: "followups",
      label: "Follow-ups",
      value: metrics.followUpsToday.length.toLocaleString("en-IN"),
      icon: <CalendarClock className="h-3.5 w-3.5" />,
      iconTone: "bg-amber-50 text-amber-600",
      meta: (
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11px] text-slate-400">
          {metrics.overdue.length > 0 && (
            <span className="rounded bg-rose-50 px-1 py-0.5 text-[11px] font-semibold text-rose-600">
              {metrics.overdue.length} overdue
            </span>
          )}
          {metrics.followUpsToday.length === 0 ? "none due today" : `${metrics.followUpsToday.length} due today`}
          {" · "}
          {metrics.openPipelineCount} open
        </span>
      ),
    },
    {
      key: "won",
      label: "Won Leads",
      value: metrics.wonCount.toLocaleString("en-IN"),
      icon: <Trophy className="h-3.5 w-3.5" />,
      iconTone: "bg-emerald-50 text-emerald-600",
      meta: (
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11px] text-slate-400">
          <span className="rounded bg-emerald-50 px-1 py-0.5 text-[11px] font-semibold text-emerald-700">
            {metrics.conversionPct.toFixed(1)}% conversion
          </span>
          <span className="hidden truncate sm:inline">
            {metrics.wonRevenue > 0 ? `${formatCurrency(metrics.wonRevenue)} generated` : "no revenue yet"}
          </span>
        </span>
      ),
    },
    {
      key: "lost",
      label: "Lost Leads",
      value: metrics.lostCount.toLocaleString("en-IN"),
      icon: <CircleX className="h-3.5 w-3.5" />,
      iconTone: "bg-rose-50 text-rose-600",
      meta: (
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11px] text-slate-400">
          <span className="rounded bg-rose-50 px-1 py-0.5 text-[11px] font-semibold text-rose-600">
            {metrics.lostPct.toFixed(1)}%
          </span>
          {range === "all" ? "of all leads" : `of ${rangeLabel.toLowerCase()} leads`}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1360px] space-y-3">
      <header className="flex flex-col gap-3 border-b border-slate-200/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold tracking-tight text-slate-900 sm:text-[22px]">
              {getGreeting()}, {user?.name || "there"}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <roleMeta.icon className="h-3 w-3" />
              {roleMeta.label}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            Here&apos;s what&apos;s happening with your sales today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Date range">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors sm:px-2.5 sm:text-[12px]",
                  range === opt.value ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {opt.short}
              </button>
            ))}
          </div>

          {isOwnerOrAdmin && (
            <div className="relative">
              <button
                onClick={() => setTeamDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-[7px] text-[12px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                aria-haspopup="listbox"
                aria-expanded={teamDropdownOpen}
              >
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span className="max-w-[110px] truncate">{selectedAgentName}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", teamDropdownOpen && "rotate-180")} />
              </button>

              {teamDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setTeamDropdownOpen(false)} />
                  <div className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                    <button
                      onClick={() => { setTeamFilter("all"); setTeamDropdownOpen(false); }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors",
                        teamFilter === "all" ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span>All Team</span>
                      <span className="text-[10px] opacity-70">{leads.length}</span>
                    </button>
                    <div className="mx-2 my-0.5 h-px bg-slate-100" />
                    {salesTeam.map((agent) => {
                      const count = leads.filter((l) => l.assignedTo === agent.id).length;
                      return (
                        <button
                          key={agent.id}
                          onClick={() => { setTeamFilter(agent.id); setTeamDropdownOpen(false); }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors",
                            teamFilter === agent.id ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <span className="truncate">{agent.name}</span>
                          <span className="text-[10px] opacity-70">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => void refreshData()}
            disabled={status !== "ready"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-[7px] text-[12px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-slate-400", status === "refreshing" && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <span className="hidden items-center gap-1.5 text-[11px] text-slate-400 xl:flex">
            <Clock className="h-3 w-3" />
            {todayDate}
          </span>
        </div>
      </header>

      {isLoadingSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <article
                key={kpi.key}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 transition-colors hover:border-slate-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{kpi.label}</span>
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", kpi.iconTone)}>
                    {kpi.icon}
                  </span>
                </div>
                <p className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 tabular-nums">
                  {kpi.value}
                </p>
                <div className="mt-1">{kpi.meta}</div>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-5">
            <SectionCard className="xl:col-span-3">
              <SectionHeader
                icon={<Target className="h-4 w-4" />}
                title="Lead Pipeline"
                subtitle={`${metrics.currentCount.toLocaleString("en-IN")} leads · ${rangeLabel}`}
                action={<SubCount>{funnel.total.toLocaleString("en-IN")}</SubCount>}
              />
              <div className="p-3">
                {funnel.total === 0 ? (
                  <div className="flex items-center justify-center gap-3 py-4 text-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <Target className="h-4 w-4" />
                    </span>
                    <p className="text-[12px] text-slate-400">
                      <span className="font-medium text-slate-600">No leads in this period.</span> Pipeline will appear here as leads come in.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {funnel.stages.map((stage) => {
                      const width =
                        funnel.maxCount > 0 && stage.count > 0
                          ? Math.max((stage.count / funnel.maxCount) * 100, 6)
                          : 0;
                      return (
                        <div key={stage.key} className="flex items-center gap-2.5">
                          <span className="flex w-[102px] shrink-0 items-center gap-1.5">
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", stage.dot)} />
                            <span className="truncate text-[12px] font-medium text-slate-600">{stage.label}</span>
                          </span>
                          <div className="flex h-4 min-w-0 flex-1 items-center justify-center rounded-md bg-slate-50/80">
                            <div
                              className={cn("h-4 rounded-md transition-all duration-300", stage.bar)}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <span className="w-[68px] shrink-0 text-right text-[12px] tabular-nums">
                            <span className="font-semibold text-slate-800">{stage.count}</span>
                            <span className="text-slate-400">
                              {" · "}
                              {funnel.total > 0 ? ((stage.count / funnel.total) * 100).toFixed(0) : "0"}%
                            </span>
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-1.5 text-[11px]">
                      <span className="font-medium uppercase tracking-wider text-slate-400">Pipeline total</span>
                      <span className="font-semibold text-slate-700 tabular-nums">{funnel.total.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard className="xl:col-span-2">
              <SectionHeader
                icon={<CalendarClock className="h-4 w-4" />}
                title="Today's Follow-ups"
                subtitle={
                  metrics.followUpsToday.length > 0
                    ? `${metrics.followUpsToday.length} due today · ${metrics.overdue.length} overdue`
                    : "Nothing scheduled for today"
                }
                action={<ViewAllLink href="/tasks" />}
              />
              {followUpsList.length === 0 ? (
                <div className="flex items-center justify-center gap-3 px-4 py-5 text-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <BadgeCheck className="h-4 w-4" />
                  </span>
                  <div className="text-left">
                    <p className="text-[12.5px] font-medium text-slate-600">No follow-ups for today</p>
                    <p className="text-[11px] text-slate-400">
                      Your team is all caught up.{" "}
                      <Link href="/tasks" className="font-semibold text-blue-600 transition-colors hover:text-blue-700">
                        View all tasks
                      </Link>
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {followUpsList.map((lead) => (
                    <li key={lead.id}>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="group flex items-center gap-2.5 px-4 py-1.5 transition-colors hover:bg-slate-50"
                      >
                        <span className={cn("h-6 w-1 shrink-0 rounded-full", PRIORITY_DOT[lead.priority] ?? "bg-slate-200")} />
                        <AvatarInitials name={lead.name || lead.company} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-semibold text-slate-800 transition-colors group-hover:text-blue-700">
                            {lead.name || lead.company}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {lead.company}
                            {lead.company && lead.location ? " · " : ""}
                            {lead.location || ""}
                          </p>
                        </div>
                        <div className="hidden shrink-0 text-right md:block">
                          <p className="flex items-center justify-end gap-1 text-[11px] font-medium text-slate-500">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {formatFollowupTime(lead.nextFollowup)}
                          </p>
                          <p className="mt-0.5 max-w-[96px] truncate text-[11px] text-slate-400">
                            {lead.assignedToName || "Unassigned"}
                          </p>
                        </div>
                        <StatusBadge status={lead.status} className="hidden shrink-0 sm:inline-flex" />
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <SectionCard>
              <SectionHeader
                icon={<Globe className="h-4 w-4" />}
                title="Lead Sources"
                subtitle={`${metrics.currentCount.toLocaleString("en-IN")} leads · ${rangeLabel}`}
                action={<SubCount>{metrics.currentCount.toLocaleString("en-IN")}</SubCount>}
              />
              <div className="p-3.5">
                {metrics.currentCount === 0 ? (
                  <div className="flex items-center justify-center gap-3 py-4 text-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <Globe className="h-4 w-4" />
                    </span>
                    <p className="text-[12px] text-slate-400">
                      <span className="font-medium text-slate-600">No leads in this period.</span> Source breakdown will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      {sources.map(
                        (s) =>
                          s.count > 0 && (
                            <span
                              key={s.key}
                              className={s.bar}
                              style={{ width: `${s.pct}%` }}
                              title={`${s.label} · ${s.count}`}
                            />
                          )
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {sources.map((s) => {
                        const SourceIcon = s.icon;
                        return (
                          <div key={s.key} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-50">
                            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", s.chip)}>
                              <SourceIcon className="h-3 w-3" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="truncate text-[12px] font-medium text-slate-600">{s.label}</p>
                                <p className="shrink-0 text-[12px] tabular-nums">
                                  <span className="font-semibold text-slate-800">{s.count}</span>
                                  <span className="text-slate-400"> · {s.pct.toFixed(0)}%</span>
                                </p>
                              </div>
                              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className={cn("h-full rounded-full", s.bar)} style={{ width: `${s.pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader
                icon={<Users className="h-4 w-4" />}
                title="Team Performance"
                subtitle="Leads · follow-ups · won for selected period"
                action={<SubCount>{salesTeam.length} members</SubCount>}
              />
              <div className="px-1 py-0.5">
                {teamPerformance.length === 0 ? (
                  <div className="flex items-center justify-center gap-3 py-4 text-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <Users className="h-4 w-4" />
                    </span>
                    <p className="text-[12px] text-slate-400">
                      <span className="font-medium text-slate-600">No active team members.</span> Add sales team members to see performance.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50">
                    {teamPerformance.map((person) => (
                      <li key={person.id}>
                        <Link
                          href="/team"
                          className="group flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-50"
                        >
                          <AvatarInitials name={person.name} tone="bg-slate-100 text-slate-600" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-semibold text-slate-800">{person.name}</p>
                            <p className="text-[11px] text-slate-400">{getRoleLabel(person.role)}</p>
                          </div>
                          <div className="grid shrink-0 grid-cols-4 gap-3 text-right sm:gap-4">
                            {[
                              { label: "Leads", value: person.leads },
                              { label: "F-ups", value: person.followups },
                              { label: "Won", value: person.won },
                              { label: "Conv.", value: person.conversion > 0 ? `${person.conversion.toFixed(0)}%` : "—" },
                            ].map((stat) => (
                              <div key={stat.label} className="min-w-[32px]">
                                <p className="text-[12px] font-semibold text-slate-800 tabular-nums">{stat.value}</p>
                                <p className="text-[10px] uppercase tracking-wider text-slate-400">{stat.label}</p>
                              </div>
                            ))}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard>
            <SectionHeader
              icon={<Activity className="h-4 w-4" />}
              title="Recent Lead Activity"
              subtitle={`Latest movement across ${metrics.currentLeads.length.toLocaleString("en-IN")} leads · ${rangeLabel}`}
              action={<SubCount>{activityEvents.length} events</SubCount>}
            />
            <div className="p-2">
              {activityEvents.length === 0 ? (
                <div className="flex items-center justify-center gap-3 py-4 text-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <Inbox className="h-4 w-4" />
                  </span>
                  <p className="text-[12px] text-slate-400">
                    <span className="font-medium text-slate-600">No recent activity.</span> Lead updates will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {activityEvents.map((event) => {
                    const meta = ACTIVITY_META[event.type];
                    const EventIcon = meta.icon;
                    return (
                      <li
                        key={event.id}
                        className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-1.5 sm:grid-cols-[28px_minmax(0,1fr)_150px_auto]"
                      >
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", meta.tint)}>
                          <EventIcon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] leading-snug text-slate-600">
                            <span className="font-semibold text-slate-800">{meta.label}</span>{" "}
                            <Link
                              href={`/leads/${event.lead.id}`}
                              className="font-medium text-slate-900 transition-colors hover:text-blue-700"
                            >
                              {event.lead.name || event.lead.company}
                            </Link>
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {event.lead.assignedToName || "Unassigned"} · {timeAgo(event.time)}
                          </p>
                        </div>
                        <p className="hidden truncate text-[11px] text-slate-400 sm:block">
                          {event.lead.company || event.lead.location}
                        </p>
                        <StatusBadge status={event.lead.status} className="hidden shrink-0 sm:inline-flex" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </SectionCard>

          <p className="pt-0.5 text-center text-[11px] text-slate-400">
            Serene CRM — Serene Agency
          </p>
        </>
      )}
    </div>
  );
}
