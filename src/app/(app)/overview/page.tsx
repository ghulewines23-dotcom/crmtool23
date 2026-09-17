"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Plus,
  Trash2,
  Calendar,
  Users,
  Building2,
  Briefcase,
  Laptop,
  Receipt,
  Tag,
  ShieldAlert,
  BarChart3,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";

interface ExpenseItem {
  id: string;
  title: string;
  category: "SALARY" | "MARKETING" | "SOFTWARE" | "OFFICE" | "COMMISSION" | "CLIENT_COST";
  amount: number;
  date: string;
  notes?: string;
}

const EXPENSE_CATEGORIES: ExpenseItem["category"][] = [
  "SALARY",
  "MARKETING",
  "SOFTWARE",
  "OFFICE",
  "COMMISSION",
  "CLIENT_COST",
];

interface MonthlyPoint {
  key: string;
  label: string;
  month: number;
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
}

interface OverviewData {
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  avgDealValue: number;
  totalWonLeads: number;
  activeTeamCount: number;
  expenseByCategory: Record<string, number>;
  monthly: MonthlyPoint[];
  /** Last 30 days, oldest → newest. Used by the Today / Last 7 / 30 Days filters. */
  daily?: MonthlyPoint[];
  expenses: ExpenseItem[];
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getCategoryBadge(category: string) {
  switch (category) {
    case "SALARY":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200"><Users className="h-3 w-3" /> Salary</span>;
    case "MARKETING":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200"><Tag className="h-3 w-3" /> Marketing</span>;
    case "SOFTWARE":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-200"><Laptop className="h-3 w-3" /> Software</span>;
    case "OFFICE":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded border-amber-200"><Building2 className="h-3 w-3" /> Office</span>;
    case "COMMISSION":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-pink-50 text-pink-700 px-2 py-0.5 rounded border-pink-200"><Briefcase className="h-3 w-3" /> Commission</span>;
    case "CLIENT_COST":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border-indigo-200"><Receipt className="h-3 w-3" /> Client Cost</span>;
    default:
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200"><Receipt className="h-3 w-3" /> Other</span>;
  }
}

export default function OverviewPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const isAllowed = user?.role === "FOUNDER" || user?.role === "ADMIN" || user?.role === "SERENE_OWNER";

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Month range filter for the chart: "1" | "2" | "3" | "6" | "12"
  const [monthFilter, setMonthFilter] = useState<string>("1");
  // Which month column is being hovered (for the tooltip)
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "COMMISSION" as ExpenseItem["category"],
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const resData = await res.json();
      if (resData.success) {
        setData(resData.overview);
      }
    } catch (err) {
      console.error("Overview load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAllowed) {
      router.push("/dashboard");
    } else if (isAuthenticated && isAllowed) {
      fetchOverview();
    }
  }, [isLoading, isAuthenticated, isAllowed, router, fetchOverview]);

  const handleAddExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expenseForm.title,
          amount: Number(expenseForm.amount),
          category: expenseForm.category,
          date: expenseForm.date,
          notes: expenseForm.notes,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setExpenseForm({ title: "", amount: "", category: "COMMISSION", date: new Date().toISOString().split("T")[0], notes: "" });
        setAddExpenseOpen(false);
        await fetchOverview();
      }
    } catch (err) {
      console.error("Add expense error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense item?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const resData = await res.json();
      if (resData.success) {
        await fetchOverview();
      }
    } catch (err) {
      console.error("Delete expense error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <ShieldAlert className="h-10 w-10 text-red-500" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground">Business Overview is accessible to Admin & Owner roles only.</p>
      </div>
    );
  }

  const grossRevenue = data?.grossRevenue || 0;
  const totalExpenses = data?.totalExpenses || 0;
  const netProfit = data?.netProfit || 0;
  const isProfitable = netProfit >= 0;
  const commissionTotal = data?.expenseByCategory?.COMMISSION || 0;

  // ── Monthly chart data ──
  // The API returns the last 12 months (oldest → newest). Fixed range filter:
  // "1" = this month, "2" = last month, "3" / "6" / "12" = last N months.
  const allMonths: MonthlyPoint[] = data?.monthly || data?.daily || [];
  const rangeToCount: Record<string, number> = {
    "1": 1,
    "2": 2,
    "3": 3,
    "6": 6,
    "12": 12,
    "7": 7,
    "30": 30,
  };
  const rangeCount = rangeToCount[monthFilter] ?? 1;
  // Use daily buckets for short windows (Today / Last 7 Days / Last 30 Days)
  // and fall back to monthly buckets when the API doesn't return daily data.
  const isDailyRange = monthFilter === "1" || monthFilter === "7" || monthFilter === "30";
  const dailyPoints: MonthlyPoint[] = data?.daily || [];
  const useDaily = isDailyRange && dailyPoints.length > 0;
  const chartPoints = useDaily
    ? dailyPoints.slice(-rangeCount)
    : allMonths.slice(-rangeCount);

  const monthOptions = [
    { value: "1", label: "Today" },
    { value: "7", label: "Last 7 Days" },
    { value: "30", label: "Last 30 Days" },
    { value: "2", label: "Last Month" },
    { value: "3", label: "Last 3 Months" },
    { value: "6", label: "Last 6 Months" },
    { value: "12", label: "Last 12 Months" },
  ];

  const chartTotal = chartPoints.reduce(
    (acc, m) => {
      acc.revenue += m.revenue;
      acc.expenses += m.expenses;
      return acc;
    },
    { revenue: 0, expenses: 0 }
  );
  const chartProfit = chartTotal.revenue - chartTotal.expenses;
  const maxValue = Math.max(
    1,
    ...chartPoints.map((m) => Math.max(m.revenue, m.expenses))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-foreground">
            Business Overview
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Financial metrics, profit & loss, and expense management
          </p>
        </div>
        <Button className="h-9 gap-1.5 text-[13px]" onClick={() => setAddExpenseOpen(true)}>
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium uppercase tracking-wide">Total Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(grossRevenue)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            From {data?.totalWonLeads || 0} won deals
          </p>
        </div>

        {/* Total Expenses */}
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium uppercase tracking-wide">Total Expenses</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(totalExpenses)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {data?.expenses.length || 0} logged expense items
            {commissionTotal > 0 ? ` + ${formatCurrency(commissionTotal)} commission` : ""}
          </p>
        </div>

        {/* Net Profit */}
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium uppercase tracking-wide">Net Profit</span>
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", isProfitable ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className={cn("mt-3 text-2xl font-bold tracking-tight", isProfitable ? "text-emerald-600" : "text-red-600")}>
            {formatCurrency(netProfit)}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={cn("text-[11px] font-medium px-1.5 py-0.2 rounded", isProfitable ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
              {data?.netMarginPercent || 0}% Margin
            </span>
          </div>
        </div>

        {/* Commission Paid */}
        <div className="rounded-xl border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium uppercase tracking-wide">Commission Paid</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(commissionTotal)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sales commission on clients
          </p>
        </div>

      </div>

      {/* Monthly Revenue / Profit / Expenses Chart */}
      <div className="rounded-xl border-border bg-white p-4 sm:p-5 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground leading-tight">Monthly Performance</h3>
              <p className="text-[11px] text-muted-foreground">
                {monthOptions.find((o) => o.value === monthFilter)?.label ?? "Today"}
              </p>
            </div>
          </div>

          {/* Range filter — sits on the section header, applies to the chart below */}
          <CustomSelect
            options={monthOptions}
            value={monthFilter}
            onChange={setMonthFilter}
            placeholder="Today"
            className="w-full sm:w-40"
            size="sm"
          />
        </div>

        <div className="flex items-center gap-3 text-[11px] font-medium mb-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Revenue
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> Expenses
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Profit
          </span>
        </div>

        {/* Compact summary strip */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-emerald-50/70 px-3 py-2">
            <p className="text-[10px] font-medium text-emerald-700/80 uppercase tracking-wide">Revenue</p>
            <p className="text-[15px] font-bold text-emerald-700 leading-tight">{formatCurrency(chartTotal.revenue)}</p>
          </div>
          <div className="rounded-lg bg-rose-50/70 px-3 py-2">
            <p className="text-[10px] font-medium text-rose-700/80 uppercase tracking-wide">Expenses</p>
            <p className="text-[15px] font-bold text-rose-700 leading-tight">{formatCurrency(chartTotal.expenses)}</p>
          </div>
          <div className={cn("rounded-lg px-3 py-2", chartProfit >= 0 ? "bg-indigo-50/70" : "bg-rose-50/70")}>
            <p className={cn("text-[10px] font-medium uppercase tracking-wide", chartProfit >= 0 ? "text-indigo-700/80" : "text-rose-700/80")}>Profit</p>
            <p className={cn("text-[15px] font-bold leading-tight", chartProfit >= 0 ? "text-indigo-700" : "text-rose-700")}>{formatCurrency(chartProfit)}</p>
          </div>
        </div>

        {/* Bars */}
        {chartPoints.every((m) => m.revenue === 0 && m.expenses === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-[13px] text-muted-foreground">
              No data for this period yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto pt-14">
            <div className="flex items-end justify-around gap-2 sm:gap-4 min-w-[320px]">
              {chartPoints.map((m) => {
                const revH = Math.round((m.revenue / maxValue) * 100);
                const expH = Math.round((m.expenses / maxValue) * 100);
                const profH = Math.round((Math.max(m.profit, 0) / maxValue) * 100);
                const isHovered = hoveredMonth === m.key;
                return (
                  <div
                    key={m.key}
                    className="group relative flex-1 min-w-[68px] flex-col cursor-pointer"
                    onMouseEnter={() => setHoveredMonth(m.key)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {/* Hover tooltip — shows the full date + values */}
                    {isHovered && (
                      <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full">
                        <div className="min-w-[132px] rounded-lg bg-slate-900 px-3 py-2 shadow-xl">
                          <p className="text-[11px] font-semibold text-white leading-none mb-1.5">
                            {m.label} {m.year}
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Revenue
                              </span>
                              <span className="text-[10px] font-semibold text-white">{formatCurrency(m.revenue)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Expenses
                              </span>
                              <span className="text-[10px] font-semibold text-white">{formatCurrency(m.expenses)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-[10px] text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Profit
                              </span>
                              <span className={cn("text-[10px] font-semibold", m.profit >= 0 ? "text-white" : "text-rose-300")}>
                                {formatCurrency(m.profit)}
                              </span>
                            </div>
                          </div>
                          {/* little arrow */}
                          <div className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
                        </div>
                      </div>
                    )}

                    {/* Bars row — fixed height, aligned to bottom */}
                    <div className="flex items-end justify-center gap-1.5 h-40 pt-4">
                      <div
                        className={cn(
                          "w-4 rounded-t-md bg-emerald-500 transition-all",
                          isHovered ? "bg-emerald-600" : ""
                        )}
                        style={{ height: `${Math.max(revH, m.revenue > 0 ? 3 : 0)}%` }}
                      />
                      <div
                        className={cn(
                          "w-4 rounded-t-md bg-rose-400 transition-all",
                          isHovered ? "bg-rose-500" : ""
                        )}
                        style={{ height: `${Math.max(expH, m.expenses > 0 ? 3 : 0)}%` }}
                      />
                      <div
                        className={cn(
                          "w-4 rounded-t-md bg-indigo-500 transition-all",
                          isHovered ? "bg-indigo-600" : ""
                        )}
                        style={{ height: `${Math.max(profH, m.profit > 0 ? 3 : 0)}%` }}
                      />
                    </div>

                    {/* Baseline tick + date label */}
                    <div className={cn("border-t transition-colors", isHovered ? "border-slate-400" : "border-slate-200")} />
                    <div className="pt-2 text-center">
                      <p className={cn("text-[11px] font-semibold leading-none transition-colors", isHovered ? "text-slate-900" : "text-foreground")}>
                        {m.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground leading-none mt-0.5">
                        {String(m.year)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Expense Category Breakdown Bars */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
          <PieChart className="h-4 w-4 text-muted-foreground" />
          Expense Distribution by Category
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {EXPENSE_CATEGORIES.map((cat) => {
            const amount = data?.expenseByCategory?.[cat] || 0;
            const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
            return (
              <div key={cat} className="rounded-lg border-border/80 bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  {getCategoryBadge(cat)}
                  <span className="text-[11px] font-medium text-muted-foreground">{pct}%</span>
                </div>
                <p className="text-[15px] font-bold text-foreground">{formatCurrency(amount)}</p>
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expense Logs Table */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="border-b border-border px-5 py-3.5 flex items-center justify-between bg-muted/10">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">Logged Expenses</h3>
            <p className="text-[12px] text-muted-foreground">All business operational & salary expenses</p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1" onClick={() => setAddExpenseOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Log Expense
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-3">Expense Details</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.expenses || []).map((item) => (
                <tr key={item.id} className="text-[13px] hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">
                    <div>
                      <p>{item.title}</p>
                      {item.notes && <p className="text-[11px] text-muted-foreground font-normal">{item.notes}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {getCategoryBadge(item.category)}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-foreground">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteExpense(item.id)}
                      disabled={deletingId === item.id}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(data?.expenses || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                    No expenses logged yet. Click "Add Expense" to start tracking business expenses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title / Description *</Label>
              <Input
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                placeholder="e.g. Meta Ads, AWS Server, Team Salary"
                className="h-9 text-[13px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="5000"
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseItem["category"] })}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none"
                >
                  <option value="SALARY">Salary</option>
                  <option value="MARKETING">Marketing / Ads</option>
                  <option value="SOFTWARE">Software / Tools</option>
                  <option value="OFFICE">Office / Rent</option>
                  <option value="COMMISSION">Commission</option>
                  <option value="CLIENT_COST">Client Project Cost</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (Optional)</Label>
              <Input
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                placeholder="Additional details..."
                className="h-9 text-[13px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddExpenseOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={submitting}>
              {submitting ? "Saving..." : "Save Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
