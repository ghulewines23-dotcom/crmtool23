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
  AlertCircle,
  Users,
  Building2,
  Briefcase,
  Laptop,
  Receipt,
  Tag,
  ShieldAlert,
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
  commission?: number;
  wonLeads?: number;
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
  /** Last 30 days, oldest → newest. Used by the day-based period filters. */
  daily?: MonthlyPoint[];
  expenses: ExpenseItem[];
}

const PERIOD_OPTIONS = [
  { value: "month", label: "This Month" },
  { value: "3d", label: "Last 3 Days" },
  { value: "6d", label: "Last 6 Days" },
  { value: "7d", label: "Last 7 Days" },
  { value: "14d", label: "Last 14 Days" },
  { value: "30d", label: "Last 30 Days" },
];

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getCategoryBadge(category: string) {
  switch (category) {
    case "SALARY":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap"><Users className="h-3 w-3" /> Salary</span>;
    case "MARKETING":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 whitespace-nowrap"><Tag className="h-3 w-3" /> Marketing</span>;
    case "SOFTWARE":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-200 whitespace-nowrap"><Laptop className="h-3 w-3" /> Software</span>;
    case "OFFICE":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded border-amber-200 whitespace-nowrap"><Building2 className="h-3 w-3" /> Office</span>;
    case "COMMISSION":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-pink-50 text-pink-700 px-2 py-0.5 rounded border-pink-200 whitespace-nowrap"><Briefcase className="h-3 w-3" /> Commission</span>;
    case "CLIENT_COST":
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border-indigo-200 whitespace-nowrap"><Receipt className="h-3 w-3" /> Client Cost</span>;
    default:
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap"><Receipt className="h-3 w-3" /> Other</span>;
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
  // Period filter for the top financial summary
  const [period, setPeriod] = useState<string>("month");

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
      // Defer slightly so state updates never happen synchronously inside the effect.
      const t = window.setTimeout(() => fetchOverview(), 0);
      return () => window.clearTimeout(t);
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

  const totalExpenses = data?.totalExpenses || 0;

  const allMonths: MonthlyPoint[] = data?.monthly || [];
  const dailyPoints: MonthlyPoint[] = data?.daily || [];

  // Resolve the selected period against the existing monthly / daily buckets.
  let periodPoints: MonthlyPoint[] = [];
  if (period === "month") {
    periodPoints = allMonths.slice(-1);
  } else {
    const days = Number(period.replace("d", ""));
    if (days > 0) periodPoints = dailyPoints.slice(-days);
  }

  const periodRevenue = periodPoints.reduce((sum, m) => sum + m.revenue, 0);
  const periodExpenses = periodPoints.reduce((sum, m) => sum + m.expenses, 0);
  const periodProfit = periodRevenue - periodExpenses;
  const periodCommission = periodPoints.reduce((sum, m) => sum + (m.commission || 0), 0);
  const periodWonLeads = periodPoints.reduce((sum, m) => sum + (m.wonLeads || 0), 0);
  const periodMargin = periodRevenue > 0 ? ((periodProfit / periodRevenue) * 100).toFixed(1) : 0;
  const isProfitable = periodProfit >= 0;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Page Header — compact */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-foreground">
            Business Overview
          </h1>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Track your agency&apos;s revenue, expenses and profit.
          </p>
        </div>
        <Button className="h-9 gap-1.5 text-[12px] shrink-0" onClick={() => setAddExpenseOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Expense
        </Button>
      </div>

      {/* Top Financial Summary — 4 compact cards */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Financial Summary
        </p>
        <CustomSelect
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
          placeholder="This Month"
          className="w-40 shrink-0"
          size="sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight text-foreground">
            {formatCurrency(periodRevenue)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            From {periodWonLeads} won deals
          </p>
        </div>

        {/* Total Expenses */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Expenses
            </p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <TrendingDown className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight text-foreground">
            {formatCurrency(periodExpenses)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Including commission
          </p>
        </div>

        {/* Net Profit */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Net Profit
            </p>
            <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", isProfitable ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              <DollarSign className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className={cn("mt-2 text-xl font-bold tracking-tight", isProfitable ? "text-emerald-600" : "text-rose-600")}>
            {formatCurrency(periodProfit)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            <span className={cn("inline-flex rounded px-1.5 py-0.5 font-medium", isProfitable ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
              {periodMargin}% margin
            </span>
          </p>
        </div>

        {/* Commission Paid */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Commission Paid
            </p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight text-foreground">
            {formatCurrency(periodCommission)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Sales commission
          </p>
        </div>
      </div>

      {/* Expense sections — two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Expense Distribution */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold text-foreground">Expense Distribution</h3>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </div>

          {totalExpenses === 0 ? (
            <div className="flex items-center justify-center gap-2 py-6 text-[12px] text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-muted-foreground/60" />
              No expenses recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {EXPENSE_CATEGORIES.map((cat) => {
                const amount = data?.expenseByCategory?.[cat] || 0;
                const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                      <span className="min-w-0 flex items-center gap-1.5 font-medium text-slate-700">
                        {getCategoryBadge(cat)}
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-semibold text-slate-900">{formatCurrency(amount)}</span>
                        <span className="w-9 text-right text-slate-500">{Math.round(pct)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Logged Expenses */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-[14px] font-semibold text-foreground">Logged Expenses</h3>
            <Button size="sm" className="h-7 gap-1 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700" onClick={() => setAddExpenseOpen(true)}>
              <Plus className="h-3 w-3" /> Add Expense
            </Button>
          </div>

          {(data?.expenses || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center">
              <AlertCircle className="h-5 w-5 text-muted-foreground/40" />
              <p className="text-[12px] text-muted-foreground">No expenses recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5">Expense</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.expenses || []).map((item) => (
                    <tr key={item.id} className="text-[12px] hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <p className="truncate max-w-[110px]">{item.title}</p>
                        {item.notes && <p className="text-[10px] text-muted-foreground font-normal truncate max-w-[110px]">{item.notes}</p>}
                      </td>
                      <td className="px-4 py-2.5">{getCategoryBadge(item.category)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                        {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
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
                </tbody>
              </table>
            </div>
          )}
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