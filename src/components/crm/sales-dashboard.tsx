"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCRMData } from "@/lib/crm-data-context";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Users,
  Award,
  Flame,
  Target,
  BarChart3,
  User,
  ShieldCheck,
  Crown,
  Briefcase,
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

export default function SalesDashboard() {
  const { user } = useAuth();
  const { leads, teamMembers, tasks } = useCRMData();

  const isOwnerOrAdmin =
    user?.role === "SERENE_OWNER" ||
    user?.role === "FOUNDER" ||
    user?.role === "ADMIN";

  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const salesAgents = useMemo(() => {
    // Only approved (active) members appear in the All Team dropdown —
    // pending/invited/suspended/rejected users must never show up here.
    return teamMembers.filter(
      (m) =>
        m.status === "active" &&
        (m.role === "SALES_PERSON" || m.role === "ADMIN" || m.role === "FOUNDER" || m.role === "SERENE_OWNER")
    );
  }, [teamMembers]);

  const currentAgentId = isOwnerOrAdmin
    ? selectedAgentId
    : user?.id || "all";

  const filteredLeads = useMemo(() => {
    if (currentAgentId === "all") return leads;
    return leads.filter((l) => l.assignedTo === currentAgentId);
  }, [leads, currentAgentId]);

  const filteredTasks = useMemo(() => {
    if (currentAgentId === "all") return tasks;
    return tasks.filter((t) => t.createdBy === currentAgentId || t.assignedTo === currentAgentId);
  }, [tasks, currentAgentId]);

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

  const selectedAgentObj = salesAgents.find((a) => a.id === selectedAgentId);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {getGreeting()}, {user?.name}
            </h1>
            <span
              className={cn(
                "text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                user?.role === "SERENE_OWNER" || user?.role === "FOUNDER"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : user?.role === "ADMIN"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
                    : "Sales"}
            </span>
          </div>
          <p className="text-[12px] sm:text-[13px] text-slate-500 mt-1">
            Sales Performance, Lead Conversions & Analytics.
          </p>
        </div>

        {/* Filter Selection Dropdown */}
        {isOwnerOrAdmin && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-[12px] sm:text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <User className="h-4 w-4 text-slate-400" />
              <span>
                {selectedAgentId === "all"
                  ? "All Team"
                  : selectedAgentObj?.name || "Select Agent"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-xl z-30 space-y-0.5">
                  <button
                    onClick={() => {
                      setSelectedAgentId("all");
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[12px] rounded-lg transition-all flex items-center justify-between",
                      selectedAgentId === "all"
                        ? "bg-slate-900 text-white font-medium"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span>All Team</span>
                    <span className="text-[10px] opacity-70">{leads.length} leads</span>
                  </button>
                  <div className="h-px bg-slate-100 my-0.5" />
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
                          "w-full text-left px-3 py-2 text-[12px] rounded-lg transition-all flex items-center justify-between",
                          selectedAgentId === agent.id
                            ? "bg-slate-900 text-white font-medium"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <span className="truncate">{agent.name}</span>
                        <span className="text-[10px] opacity-70">{agentLeadCount}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Assigned Leads */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Assigned</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-slate-900">{metrics.totalAssigned}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            <span className="text-blue-500 font-medium">{metrics.notConnected}</span> not connected
          </p>
        </div>

        {/* Won Deals */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Won</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-600">{metrics.wonCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span className="text-emerald-600 font-semibold">{formatCurrency(metrics.totalValue)}</span>
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Conversion</span>
            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-500">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-slate-900">{metrics.conversionRate}%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-violet-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Number(metrics.conversionRate), 100)}%` }}
            />
          </div>
        </div>

        {/* Hot & Follow-ups */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Hot Pipeline</span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-500">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-orange-600">{metrics.hotLeads}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            <span className="font-semibold text-slate-700">{metrics.followUps}</span> follow-ups
          </p>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Funnel Breakdown */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <h2 className="text-[13px] font-semibold text-slate-900">Sales Lead Funnel</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {metrics.totalAssigned} Total
            </span>
          </div>

          <div className="space-y-3">
            {/* Not Connected */}
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-slate-500">Not Connected</span>
                <span className="text-slate-600">{metrics.notConnected} ({metrics.totalAssigned > 0 ? Math.round((metrics.notConnected / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-slate-300 h-full rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.notConnected / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Follow up */}
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-blue-500">Follow-up</span>
                <span className="text-blue-500">{metrics.followUps} ({metrics.totalAssigned > 0 ? Math.round((metrics.followUps / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.followUps / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Hot Lead */}
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-orange-500">Hot Leads</span>
                <span className="text-orange-500">{metrics.hotLeads} ({metrics.totalAssigned > 0 ? Math.round((metrics.hotLeads / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.hotLeads / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Won */}
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-emerald-600 font-semibold">Won Deals</span>
                <span className="text-emerald-600 font-semibold">{metrics.wonCount} ({metrics.totalAssigned > 0 ? Math.round((metrics.wonCount / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.wonCount / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Lost */}
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium">
                <span className="text-red-400">Lost Leads</span>
                <span className="text-red-400">{metrics.lostLeads} ({metrics.totalAssigned > 0 ? Math.round((metrics.lostLeads / metrics.totalAssigned) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-red-300 h-full rounded-full transition-all"
                  style={{ width: `${metrics.totalAssigned > 0 ? (metrics.lostLeads / metrics.totalAssigned) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Target Progress */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              <h2 className="text-[13px] font-semibold text-slate-900">Monthly Sales Goal</h2>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>

          <div className="space-y-3 py-1">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[11px] text-slate-400">Revenue</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
                  {formatCurrency(metrics.totalValue)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Deals</p>
                <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-0.5">
                  {metrics.wonCount}
                </p>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-slate-500">
                <span>Goal Progress</span>
                <span className="text-slate-900 font-semibold">{metrics.conversionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(Number(metrics.conversionRate), 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Tasks Done</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {metrics.completedTasksCount}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Hot Pipeline</span>
                <span className="text-base font-bold text-orange-500 mt-0.5 block">
                  {metrics.hotLeads}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
