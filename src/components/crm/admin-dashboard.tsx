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

type Range = "15d" | "30d" | "3m" | "6m" | "1y";

const rangeLabels: Record<Range, string> = {
  "15d": "Last 15 Days",
  "30d": "Last 30 Days",
  "3m": "3 Months",
  "6m": "6 Months",
  "1y": "1 Year",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { leads, clients, teamMembers } = useCRMData();
  const [range, setRange] = useState<Range>("6m");
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
    const newLeads = leads.filter((l) => l.status === "new").length;
    const hotLeads = leads.filter((l) => l.status === "hot_lead").length;
    const lostLeads = leads.filter((l) => l.status === "lost").length;

    return {
      totalRevenue,
      estimatedProfit,
      activeClients,
      wonLeadsCount,
      conversionRate,
      totalLeads,
      newLeads,
      hotLeads,
      lostLeads,
    };
  }, [leads, clients]);

  const salesPerformance = useMemo(() =>
    teamMembers
      .filter((m) => m.role === "SALES_PERSON" || m.role === "ADMIN" || m.role === "FOUNDER")
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

  const allRevenueData = useMemo(() => [
    { month: "Apr", revenue: 180000, profit: 63000 },
    { month: "May", revenue: 210000, profit: 73500 },
    { month: "Jun", revenue: 195000, profit: 68250 },
    { month: "Jul", revenue: 240000, profit: 84000 },
    { month: "Aug", revenue: 225000, profit: 78750 },
    { month: "Sep", revenue: metrics.totalRevenue, profit: metrics.estimatedProfit },
  ], [metrics.totalRevenue, metrics.estimatedProfit]);

  const dailyData = useMemo(() => [
    { day: "Sep 1", revenue: 8000, profit: 2800 },
    { day: "Sep 3", revenue: 12000, profit: 4200 },
    { day: "Sep 5", revenue: 6000, profit: 2100 },
    { day: "Sep 7", revenue: 15000, profit: 5250 },
    { day: "Sep 9", revenue: 9000, profit: 3150 },
    { day: "Sep 11", revenue: 18000, profit: 6300 },
    { day: "Sep 13", revenue: 11000, profit: 3850 },
    { day: "Sep 14", revenue: metrics.totalRevenue / 14, profit: metrics.estimatedProfit / 14 },
  ], [metrics.totalRevenue, metrics.estimatedProfit]);

  const chartData = range === "15d" || range === "30d"
    ? dailyData.slice(0, range === "15d" ? 5 : 8)
    : range === "3m"
    ? allRevenueData.slice(-3)
    : range === "1y"
    ? allRevenueData
    : allRevenueData;

  const maxVal = Math.max(...chartData.map((d) => d.revenue));

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
            {chartData.map((d, i) => (
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
                      {"day" in d ? d.day : d.month}
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
                  {"day" in d ? d.day : d.month}
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
            { label: "New Leads", value: metrics.newLeads, color: "text-foreground" },
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
