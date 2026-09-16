"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
import { cn } from "@/lib/utils";
import {
  IndianRupee,
  TrendingUp,
  Users,
  UserCheck,
  Percent,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

type Range = "all" | "15d" | "30d" | "3m" | "6m" | "1y";

const rangeLabels: Record<Range, string> = {
  all: "All Time",
  "15d": "Last 15 Days",
  "30d": "Last 30 Days",
  "3m": "Last 3 Months",
  "6m": "Last 6 Months",
  "1y": "Last 1 Year",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { leads, clients, teamMembers } = useCRMData();
  const [range, setRange] = useState<Range>("all");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const metrics = useMemo(() => {
    const wonLeads = leads.filter((l) => l.status === "won");
    const totalRevenue = wonLeads.reduce((sum, l) => sum + l.value, 0);
    const estimatedProfit = Math.round(totalRevenue * 0.35);
    const activeClients = clients.length;
    const wonLeadsCount = wonLeads.length;
    const conversionRate = leads.length > 0 ? ((wonLeadsCount / leads.length) * 100).toFixed(1) : "0";

    const totalLeads = leads.length;
    const notConnectedLeads = leads.filter((l) => l.status === "not_connected").length;
    const hotLeads = leads.filter((l) => l.status === "hot_lead").length;
    const lostLeads = leads.filter((l) => l.status === "lost").length;

    return {
      totalRevenue,
      estimatedProfit,
      activeClients,
      wonLeadsCount,
      conversionRate,
      totalLeads,
      notConnectedLeads,
      hotLeads,
      lostLeads,
    };
  }, [leads, clients]);

  const salesPerformance = useMemo(() =>
    teamMembers
      .filter((m) => m.role === "SALES_PERSON" || m.role === "ADMIN")
      .map((m) => {
        const memberLeads = leads.filter((l) => l.assignedTo === m.id);
        const memberWon = memberLeads.filter((l) => l.status === "won").length;
        const rate = memberLeads.length > 0 ? ((memberWon / memberLeads.length) * 100).toFixed(1) : "0";
        return {
          id: m.id,
          name: m.name,
          leads: memberLeads.length,
          wonLeads: memberWon,
          conversion: rate,
        };
      })
      .sort((a, b) => b.wonLeads - a.wonLeads),
    [leads, teamMembers]
  );

  // Build chart data from actual won leads grouped by month (Aug 2025 onwards)
  const chartData = useMemo(() => {
    const wonLeads = leads.filter((l) => l.status === "won" && l.value > 0);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();

    // Agency started Aug 2025 — show from Aug to current month
    const startYear = 2025;
    const startMonth = 7; // August (0-indexed)
    const months: { label: string; year: number; month: number }[] = [];

    let y = startYear;
    let m = startMonth;
    while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
      months.push({ label: monthNames[m], year: y, month: m });
      m++;
      if (m > 11) { m = 0; y++; }
    }

    return months.map((month) => {
      const monthLeads = wonLeads.filter((l) => {
        const d = new Date(l.createdAt || l.lastActivity || now);
        return d.getFullYear() === month.year && d.getMonth() === month.month;
      });
      const revenue = monthLeads.reduce((sum, l) => sum + (l.value || 0), 0);
      return {
        label: month.label,
        revenue,
        profit: Math.round(revenue * 0.35),
      };
    });
  }, [leads]);

  const chartDisplayData = useMemo(() => {
    if (range === "all" || range === "1y") return chartData;
    const now = new Date();
    let monthsBack = 12;
    if (range === "15d") monthsBack = 0.5;
    else if (range === "30d") monthsBack = 1;
    else if (range === "3m") monthsBack = 3;
    else if (range === "6m") monthsBack = 6;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    return chartData.filter((d) => {
      const idx = chartData.indexOf(d);
      const monthDate = new Date(2025, 7 + idx, 1);
      return monthDate >= cutoff;
    });
  }, [chartData, range]);

  const maxVal = Math.max(...chartDisplayData.map((d) => d.revenue), 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-[30px] font-semibold tracking-tight">
            {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Here&apos;s how your business is performing.
          </p>
        </div>
        <p className="text-[12px] text-muted-foreground mt-2 hidden sm:block">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={<IndianRupee className="h-[18px] w-[18px]" />}
          title="Revenue"
          value={formatCurrency(metrics.totalRevenue)}
        />
        <KpiCard
          icon={<TrendingUp className="h-[18px] w-[18px]" />}
          title="Profit"
          value={formatCurrency(metrics.estimatedProfit)}
        />
        <KpiCard
          icon={<Users className="h-[18px] w-[18px]" />}
          title="Total Leads"
          value={metrics.totalLeads}
        />
        <KpiCard
          icon={<UserCheck className="h-[18px] w-[18px]" />}
          title="Active Clients"
          value={metrics.activeClients}
        />
        <KpiCard
          icon={<Percent className="h-[18px] w-[18px]" />}
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
        />
      </div>

      {/* Revenue & Profit Chart */}
      <div className="rounded-xl border border-[#E7E7E5] bg-white p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[14px] font-semibold text-foreground">Revenue & Profit</h2>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E7E7E5] px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-[#F8F8F6] transition-colors"
            >
              {rangeLabels[range]}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[#E7E7E5] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-10">
                <div className="p-1">
                  {(["15d", "30d", "3m", "6m", "1y"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRange(r); setDropdownOpen(false); }}
                      className={cn(
                        "w-full rounded-md px-3 py-1.5 text-left text-[12px] transition-colors",
                        range === r
                          ? "bg-primary/5 text-primary font-medium"
                          : "text-muted-foreground hover:bg-[#F4F4F5]"
                      )}
                    >
                      {rangeLabels[r]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="relative">
          <div className="flex items-end gap-2" style={{ height: "200px" }}>
            {chartDisplayData.map((d, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1.5 relative"
                onMouseEnter={() => setHoveredBar(i)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Tooltip */}
                {hoveredBar === i && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-lg border border-[#E7E7E5] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] px-3 py-2 z-10 whitespace-nowrap">
                    <p className="text-[11px] font-medium text-foreground mb-1">
                      {d.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Revenue: {formatCurrency(d.revenue)}</p>
                    <p className="text-[11px] text-muted-foreground">Profit: {formatCurrency(d.profit)}</p>
                  </div>
                )}
                <div className="w-full flex gap-1 items-end" style={{ height: "160px" }}>
                  <div
                    className="flex-1 rounded-t-sm transition-opacity hover:opacity-80"
                    style={{
                      height: `${(d.revenue / maxVal) * 100}%`,
                      backgroundColor: "#2563eb",
                    }}
                  />
                  <div
                    className="flex-1 rounded-t-sm transition-opacity hover:opacity-80"
                    style={{
                      height: `${(d.profit / maxVal) * 100}%`,
                      backgroundColor: "#16a34a",
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {d.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-[#2563eb]" />
            Revenue
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-[#16a34a]" />
            Profit
          </div>
        </div>
      </div>

      {/* Lead Performance */}
      <div className="rounded-xl border border-[#E7E7E5] bg-white p-5">
        <h2 className="text-[14px] font-semibold text-foreground mb-4">Lead Performance</h2>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Total Leads", value: metrics.totalLeads, color: "text-foreground" },
            { label: "Not Connected", value: metrics.notConnectedLeads, color: "text-foreground" },
            { label: "Hot Leads", value: metrics.hotLeads, color: "text-foreground" },
            { label: "Won Leads", value: metrics.wonLeadsCount, color: "text-emerald-600" },
            { label: "Lost Leads", value: metrics.lostLeads, color: "text-red-500" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className={cn("text-[22px] font-semibold", item.color)}>{item.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sales Performance */}
      <div className="rounded-xl border border-[#E7E7E5] bg-white">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7E7E5]">
          <h2 className="text-[14px] font-semibold text-foreground">Sales Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E7E7E5]">
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5">Salesperson</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5">Leads</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5">Won</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {salesPerformance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                    No team members found.
                  </td>
                </tr>
              ) : (
                salesPerformance.map((person) => (
                  <tr key={person.id} className="border-b border-[#E7E7E5] last:border-0 hover:bg-[#F8F8F6] transition-colors">
                    <td className="px-5 py-3 text-[12px] font-medium text-foreground">{person.name}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">{person.leads}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">{person.wonLeads}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">{person.conversion}%</td>
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
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-[#E7E7E5] bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-muted-foreground">{title}</p>
          <p className="mt-1 text-[24px] font-semibold tracking-tight leading-none">{value}</p>
        </div>
        <div className="text-muted-foreground mt-0.5">{icon}</div>
      </div>
    </div>
  );
}
