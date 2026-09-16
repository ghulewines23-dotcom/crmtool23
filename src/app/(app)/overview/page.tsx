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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseItem {
  id: string;
  title: string;
  category: "SALARY" | "MARKETING" | "SOFTWARE" | "OFFICE" | "MISC";
  amount: number;
  date: string;
  notes?: string;
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
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200"><Building2 className="h-3 w-3" /> Office</span>;
    default:
      return <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200"><Receipt className="h-3 w-3" /> Misc</span>;
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

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "MISC" as ExpenseItem["category"],
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
        setExpenseForm({ title: "", amount: "", category: "MISC", date: new Date().toISOString().split("T")[0], notes: "" });
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

        {/* Avg Deal Size */}
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[12px] font-medium uppercase tracking-wide">Avg Deal Value</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(data?.avgDealValue || 0)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Across active sales team ({data?.activeTeamCount || 0} members)
          </p>
        </div>
      </div>

      {/* Expense Category Breakdown Bars */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
          <PieChart className="h-4 w-4 text-muted-foreground" />
          Expense Distribution by Category
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(data?.expenseByCategory || {}).map(([cat, amount]) => {
            const pct = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(0) : 0;
            return (
              <div key={cat} className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-1.5">
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
                  <option value="MISC">Misc</option>
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
