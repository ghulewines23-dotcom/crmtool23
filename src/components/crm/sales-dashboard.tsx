"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Users,
  Clock,
  AlertTriangle,
  Flame,
  Trophy,
  Percent,
  CheckCircle2,
  ExternalLink,
  TrendingUp,
  Phone,
  Mail,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function SalesDashboard() {
  const { user } = useAuth();
  const { leads, followUps, teamMembers } = useCRMData();
  const [completedReminders, setCompletedReminders] = useState<string[]>([]);

  const isSales = user?.role === "SALES_PERSON";

  // For sales agents: only their leads. For others: all leads.
  const visibleLeads = isSales
    ? leads.filter((l) => l.assignedTo === user?.id || !l.assignedTo)
    : leads;

  const myFollowUps = isSales
    ? followUps.filter((f) => f.assignedTo === user?.id)
    : followUps;

  // KPIs
  const totalLeads = visibleLeads.length;
  const todayFollowUps = myFollowUps.filter((f) => f.type === "today");
  const overdueFollowUps = myFollowUps.filter((f) => f.type === "overdue");
  const hotLeads = visibleLeads.filter((l) => l.status === "hot_lead").length;
  const newLeads = visibleLeads.filter((l) => l.status === "new").length;
  const wonLeads = visibleLeads.filter((l) => l.status === "won").length;
  const lostLeads = visibleLeads.filter((l) => l.status === "lost").length;
  const processingLeads = visibleLeads.filter((l) => l.status === "processing").length;
  const conversion = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0";
  const totalRevenue = visibleLeads.filter((l) => l.status === "won").reduce((sum, l) => sum + l.value, 0);

  // Pipeline
  const pipelineStages = [
    { name: "New", count: newLeads, color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Processing", count: processingLeads, color: "text-amber-600", bg: "bg-amber-50" },
    { name: "Hot", count: hotLeads, color: "text-orange-600", bg: "bg-orange-50" },
    { name: "Won", count: wonLeads, color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "Lost", count: lostLeads, color: "text-red-600", bg: "bg-red-50" },
  ];

  // Recent leads (sorted by lastActivity)
  const recentLeads = useMemo(() =>
    [...visibleLeads]
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, 8),
    [visibleLeads]
  );

  // Hot leads list
  const hotLeadsList = useMemo(() =>
    visibleLeads.filter((l) => l.status === "hot_lead").slice(0, 5),
    [visibleLeads]
  );

  // Upcoming follow-ups
  const upcomingFollowUps = useMemo(() =>
    myFollowUps
      .filter((f) => f.type === "tomorrow" || f.type === "upcoming")
      .slice(0, 5),
    [myFollowUps]
  );

  function markDone(id: string) {
    setCompletedReminders((prev) => [...prev, id]);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight">
            {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {isSales ? "Here&apos;s what you need to work on today." : "Here&apos;s how your business is performing."}
          </p>
        </div>
        <p className="text-[12px] text-muted-foreground mt-2 hidden sm:block">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={<Users className="h-4 w-4" />} title="Total Leads" value={totalLeads} />
        <KpiCard icon={<Flame className="h-4 w-4" />} title="Hot Leads" value={hotLeads} alert={hotLeads > 0} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} title="New Leads" value={newLeads} />
        <KpiCard icon={<Clock className="h-4 w-4" />} title="Follow-ups Today" value={todayFollowUps.length} />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Overdue"
          value={overdueFollowUps.length}
          alert={overdueFollowUps.length > 0}
        />
        <KpiCard icon={<Trophy className="h-4 w-4" />} title="Won" value={wonLeads} />
      </div>

      {/* Second row KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <KpiCard icon={<Percent className="h-4 w-4" />} title="Conversion" value={`${conversion}%`} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} title="Revenue" value={`₹${(totalRevenue / 1000).toFixed(0)}K`} />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} title="Processing" value={processingLeads} />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} title="Lost" value={lostLeads} alert={lostLeads > 0} />
      </div>

      {/* Lead Pipeline */}
      <div className="rounded-xl border border-[#E7E7E5] bg-white p-5">
        <h2 className="text-[14px] font-semibold text-foreground mb-4">Lead Pipeline</h2>
        <div className="grid grid-cols-5 gap-3">
          {pipelineStages.map((stage) => (
            <Link
              key={stage.name}
              href={`/leads?status=${stage.name.toLowerCase().replace("-", "_")}`}
              className={cn("text-center rounded-lg border border-[#E7E7E5] p-3 hover:bg-[#F8F8F6] transition-colors")}
            >
              <p className={cn("text-[22px] font-semibold", stage.color)}>{stage.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stage.name}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Follow-ups */}
        {todayFollowUps.length > 0 && (
          <div className="rounded-xl border border-[#E7E7E5] bg-white">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7E7E5]">
              <h2 className="text-[14px] font-semibold text-foreground">Today&apos;s Follow-ups</h2>
            </div>
            <div className="divide-y divide-[#E7E7E5]">
              {todayFollowUps.map((fu) => (
                <div key={fu.id} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2
                    className={cn(
                      "h-4 w-4 shrink-0 cursor-pointer transition-colors",
                      completedReminders.includes(fu.id)
                        ? "text-emerald-500"
                        : "text-muted-foreground hover:text-emerald-500"
                    )}
                    onClick={() => markDone(fu.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{fu.leadName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{fu.lastConversation}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fu.time}</span>
                  <Link href={`/leads/${fu.leadId}`}>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hot Leads */}
        {hotLeadsList.length > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/30">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-orange-200">
              <Flame className="h-4 w-4 text-orange-500" />
              <h2 className="text-[14px] font-semibold text-orange-700">Hot Leads</h2>
            </div>
            <div className="divide-y divide-orange-200">
              {hotLeadsList.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{lead.requirement}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{lead.company}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lead.phone && <Phone className="h-3 w-3 text-muted-foreground" />}
                    {lead.email && <Mail className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <Link href={`/leads/${lead.id}`}>
                    <ExternalLink className="h-3.5 w-3.5 text-orange-500 hover:text-orange-700" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue */}
        {overdueFollowUps.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50/50">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h2 className="text-[14px] font-semibold text-red-700">Overdue</h2>
            </div>
            <div className="divide-y divide-red-200">
              {overdueFollowUps.map((fu) => (
                <div key={fu.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-red-700 truncate">{fu.leadName}</p>
                    <p className="text-[11px] text-red-500 truncate">{fu.service}</p>
                  </div>
                  <Link href={`/leads/${fu.leadId}`}>
                    <ExternalLink className="h-3.5 w-3.5 text-red-500 hover:text-red-700" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Follow-ups */}
        {upcomingFollowUps.length > 0 && (
          <div className="rounded-xl border border-[#E7E7E5] bg-white">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7E7E5]">
              <h2 className="text-[14px] font-semibold text-foreground">Upcoming Follow-ups</h2>
            </div>
            <div className="divide-y divide-[#E7E7E5]">
              {upcomingFollowUps.map((fu) => (
                <div key={fu.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{fu.leadName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{fu.lastConversation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted-foreground">{fu.date}</p>
                    <p className="text-[11px] text-muted-foreground">{fu.time}</p>
                  </div>
                  <Link href={`/leads/${fu.leadId}`}>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Leads Table */}
      <div className="rounded-xl border border-[#E7E7E5] bg-white">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7E7E5]">
          <h2 className="text-[14px] font-semibold text-foreground">Recent Leads</h2>
          <Link href="/leads" className="text-[11px] text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E7E7E5]">
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5">Requirement</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5 hidden sm:table-cell">Company</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5 hidden md:table-cell">Phone</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5">Status</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5 hidden lg:table-cell">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                    No leads found.
                  </td>
                </tr>
              ) : (
                recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-[#E7E7E5] last:border-0 hover:bg-[#F8F8F6] transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/leads/${lead.id}`} className="text-[12px] font-medium text-foreground hover:underline">
                        {lead.requirement}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground hidden sm:table-cell">{lead.company}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground hidden md:table-cell">{lead.phone}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">{lead.assignedToName || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-muted-foreground py-2">
        Serene CRM — Simple CRM for growing businesses
      </p>
    </div>
  );
}

function KpiCard({
  icon,
  title,
  value,
  alert,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3.5",
        alert ? "border-red-200 bg-red-50/50" : "border-[#E7E7E5]"
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn("text-muted-foreground", alert && "text-red-500")}>{icon}</div>
        <p className="text-[11px] text-muted-foreground">{title}</p>
      </div>
      <p className={cn("text-[20px] font-semibold tracking-tight", alert && "text-red-600")}>{value}</p>
    </div>
  );
}
