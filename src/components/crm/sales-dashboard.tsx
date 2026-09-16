"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Users,
  Award,
  PhoneCall,
  CheckCircle2,
  Flame,
  IndianRupee,
  ChevronDown,
  Target,
  BarChart3,
  PieChart,
  User,
  ShieldCheck,
  Crown,
  Briefcase,
  ArrowUpRight,
  Clock,
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

export default function SalesDashboard() {
  const { user } = useAuth();
  const { leads, teamMembers, tasks } = useCRMData();

  const isOwnerOrAdmin =
    user?.role === "SERENE_OWNER" ||
    user?.role === "FOUNDER" ||
    user?.role === "ADMIN";

  // Filter selection: "all" or specific team member ID
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Available sales persons list
  const salesAgents = useMemo(() => {
    return teamMembers.filter(
      (m) => m.role === "SALES_PERSON" || m.role === "ADMIN" || m.role === "FOUNDER" || m.role === "SERENE_OWNER"
    );
  }, [teamMembers]);

  // Effective agent ID for current view
  const currentAgentId = isOwnerOrAdmin
    ? selectedAgentId
    : user?.id || "all";

  // Filter leads based on selected agent
  const filteredLeads = useMemo(() => {
    if (currentAgentId === "all") return leads;
    return leads.filter((l) => l.assignedTo === currentAgentId);
  }, [leads, currentAgentId]);

  // Filter tasks based on selected agent
  const filteredTasks = useMemo(() => {
    if (currentAgentId === "all") return tasks;
    return tasks.filter((t) => t.createdBy === currentAgentId || t.assignedTo === currentAgentId);
  }, [tasks, currentAgentId]);

  // Performance Metrics
  const metrics = useMemo(() => {
    const totalAssigned = filteredLeads.length;
    const notConnected = filteredLeads.filter((l) => l.status === "not_connected").length;
    const followUps = filteredLeads.filter((l) => l.status === "follow_up").length;
    const hotLeads = filteredLeads.filter((l) => l.status === "hot_lead").length;
    const wonLeads = filteredLeads.filter((l) => l.status === "won");
    const lostLeads = filteredLeads.filter((l) => l.status === "lost").length;

    const wonCount = wonLeads.length;
    const totalValue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    const conversionRate =
      totalAssigned > 0 ? ((wonCount / totalAssigned) * 100).toFixed(1) : "0";

    const completedTasksCount = filteredTasks.filter((t) => t.status === "completed").length;

    return {
      totalAssigned,
      notConnected,
      followUps,
      hotLeads,
      wonCount,
      lostLeads,
      totalValue,
      conversionRate,
      completedTasksCount,
    };
  }, [filteredLeads, filteredTasks]);

  // Sales Leaderboard data (comparing each agent)
  const leaderboard = useMemo(() => {
    return salesAgents
      .map((agent) => {
        const agentLeads = leads.filter((l) => l.assignedTo === agent.id);
        const won = agentLeads.filter((l) => l.status === "won");
        const wonCount = won.length;
        const revenue = won.reduce((sum, l) => sum + (l.value || 0), 0);
        const rate =
          agentLeads.length > 0
            ? Number(((wonCount / agentLeads.length) * 100).toFixed(1))
            : 0;

        const agentTasks = tasks.filter(
          (t) => t.createdBy === agent.id && t.status === "completed"
        ).length;

        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
          totalLeads: agentLeads.length,
          wonCount,
          revenue,
          conversionRate: rate,
          completedTasks: agentTasks,
        };
      })
      .sort((a, b) => b.wonCount - a.wonCount || b.revenue - a.revenue);
  }, [salesAgents, leads, tasks]);

  const selectedAgentObj = salesAgents.find((a) => a.id === selectedAgentId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {getGreeting()}, {user?.name} 👋
            </h1>
            <span
              className={cn(
                "text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1",
                user?.role === "SERENE_OWNER" || user?.role === "FOUNDER"
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : user?.role === "ADMIN"
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
              )}
            >
              {(user?.role === "SERENE_OWNER" || user?.role === "FOUNDER") && <Crown className="h-3 w-3" />}
              {user?.role === "ADMIN" && <ShieldCheck className="h-3 w-3" />}
              {user?.role === "SALES_PERSON" && <Briefcase className="h-3 w-3" />}
              {user?.role === "SERENE_OWNER"
                ? "Owner"
                : user?.role === "FOUNDER"
                ? "Founder"
                : user?.role === "ADMIN"
                ? "Admin"
                : "Sales Person"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time Sales Performance, Lead Conversions & Team Analytics.
          </p>
        </div>

        {/* Filter Selection Dropdown */}
        {isOwnerOrAdmin && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-xs sm:text-sm font-medium hover:bg-muted/50 transition-colors shadow-sm"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {selectedAgentId === "all"
                  ? "All Sales Team"
                  : selectedAgentObj?.name || "Select Agent"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 shadow-xl z-30 space-y-1">
                <button
                  onClick={() => {
                    setSelectedAgentId("all");
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between",
                    selectedAgentId === "all"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <span>All Sales Team</span>
                  <span className="text-[10px] opacity-80">{leads.length} leads</span>
                </button>
                <div className="h-px bg-border my-1" />
                {salesAgents.map((agent) => {
                  const agentLeadCount = leads.filter((l) => l.assignedTo === agent.id).length;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between",
                        selectedAgentId === agent.id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span className="truncate">{agent.name}</span>
                      <span className="text-[10px] opacity-80">{agentLeadCount} leads</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Assigned Leads */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Assigned Leads</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2">{metrics.totalAssigned}</p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-blue-600 font-medium">{metrics.notConnected} not connected</span>
          </p>
        </div>

        {/* Won Deals */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Deals Won</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-600">{metrics.wonCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-600 font-semibold">{formatCurrency(metrics.totalValue)}</span> revenue
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Conversion Rate</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2">{metrics.conversionRate}%</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Number(metrics.conversionRate), 100)}%` }}
            />
          </div>
        </div>

        {/* Hot & Follow-ups */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Hot Pipeline</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-amber-600">{metrics.hotLeads}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{metrics.followUps}</span> follow-ups pending
          </p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales Funnel Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Sales Lead Funnel</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {metrics.totalAssigned} Total Leads
            </span>
          </div>

          <div className="space-y-3">
            {/* Not Connected */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-muted-foreground">Not Connected</span>
                <span>{metrics.notConnected} ({metrics.totalAssigned > 0 ? Math.round((metrics.notConnected / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-zinc-400 h-2 rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.notConnected / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Follow up */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-blue-600">Follow-up</span>
                <span className="text-blue-600">{metrics.followUps} ({metrics.totalAssigned > 0 ? Math.round((metrics.followUps / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.followUps / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Hot Lead */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-amber-600">Hot Leads</span>
                <span className="text-amber-600">{metrics.hotLeads} ({metrics.totalAssigned > 0 ? Math.round((metrics.hotLeads / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.hotLeads / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Won */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-emerald-600 font-semibold">Won Deals</span>
                <span className="text-emerald-600 font-semibold">{metrics.wonCount} ({metrics.totalAssigned > 0 ? Math.round((metrics.wonCount / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.wonCount / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Lost */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-red-500">Lost Leads</span>
                <span className="text-red-500">{metrics.lostLeads} ({metrics.totalAssigned > 0 ? Math.round((metrics.lostLeads / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-red-400 h-2 rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.lostLeads / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Target Progress */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-foreground">Monthly Sales Goal</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Active Goal
            </span>
          </div>

          <div className="space-y-4 py-2">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Revenue Generated</p>
                <p className="text-3xl font-extrabold text-foreground mt-0.5">
                  {formatCurrency(metrics.totalValue)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Deals Converted</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">
                  {metrics.wonCount} Deals
                </p>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Overall Goal Progress</span>
                <span className="text-foreground font-semibold">{metrics.conversionRate}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(Number(metrics.conversionRate), 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Tasks Completed</span>
                <span className="text-base font-bold text-foreground mt-0.5 block">
                  {metrics.completedTasksCount} Tasks
                </span>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Hot Pipeline</span>
                <span className="text-base font-bold text-amber-600 mt-0.5 block">
                  {metrics.hotLeads} Hot Leads
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Team Performance Leaderboard Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm space-y-3">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-bold text-foreground">Sales Team Leaderboard</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Performance rankings across all sales agents.
            </p>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md self-start sm:self-auto font-mono">
            {leaderboard.length} Agents Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                <th className="px-4 py-3 w-12 text-center">Rank</th>
                <th className="px-4 py-3">Sales Person</th>
                <th className="px-4 py-3 text-center">Assigned Leads</th>
                <th className="px-4 py-3 text-center">Won Deals</th>
                <th className="px-4 py-3 text-center">Conversion</th>
                <th className="px-4 py-3 text-right">Revenue (₹)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leaderboard.map((agent, index) => {
                const isCurrent = agent.id === user?.id;
                return (
                  <tr
                    key={agent.id}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      isCurrent && "bg-emerald-50/30"
                    )}
                  >
                    {/* Rank Badge */}
                    <td className="px-4 py-3.5 text-center font-bold">
                      {index === 0 && <span className="text-lg">🥇</span>}
                      {index === 1 && <span className="text-lg">🥈</span>}
                      {index === 2 && <span className="text-lg">🥉</span>}
                      {index > 2 && <span className="text-muted-foreground font-mono">#{index + 1}</span>}
                    </td>

                    {/* Agent Name */}
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          {agent.name}
                          {isCurrent && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-normal">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{agent.email}</p>
                      </div>
                    </td>

                    {/* Total Leads */}
                    <td className="px-4 py-3.5 text-center font-medium">
                      {agent.totalLeads}
                    </td>

                    {/* Won Count */}
                    <td className="px-4 py-3.5 text-center font-bold text-emerald-600">
                      {agent.wonCount}
                    </td>

                    {/* Conversion Rate */}
                    <td className="px-4 py-3.5 text-center font-medium">
                      <span className="px-2 py-0.5 rounded bg-muted text-foreground">
                        {agent.conversionRate}%
                      </span>
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                      {formatCurrency(agent.revenue)}
                    </td>

                    {/* Performance Status */}
                    <td className="px-4 py-3.5 text-center">
                      {agent.wonCount >= 5 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          🌟 Top Performer
                        </span>
                      ) : agent.wonCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                          👍 Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                          ⏳ In Pipeline
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
