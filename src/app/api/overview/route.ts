import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Client from "@/models/Client";
import Lead from "@/models/Lead";
import Expense from "@/models/Expense";
import TeamMember from "@/models/TeamMember";
import { requireRole } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, "FOUNDER", "ADMIN", "SERENE_OWNER");
  if ("error" in auth) return auth.error;

  const organizationId = auth.user.organizationId;

  try {
    await connectDB();

    // 1. Fetch Clients to calculate Client Revenue, Client Expenses & Commissions
    const clients = await Client.find({ organizationId })
      .select("totalAmount amountPaid expenses commission name createdAt")
      .lean();
    const clientRevenue = clients.reduce((sum, c) => sum + (c.amountPaid || c.totalAmount || 0), 0);
    const clientExpenses = clients.reduce((sum, c) => sum + (c.expenses || 0), 0);
    const clientCommission = clients.reduce((sum, c) => sum + (c.commission || 0), 0);

    // 2. Fetch Won Leads revenue
    const wonLeads = await Lead.find({ organizationId, status: "won" })
      .select("value name company createdAt")
      .lean();
    const wonLeadsRevenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    const totalWonLeads = wonLeads.length;

    const grossRevenue = clientRevenue + wonLeadsRevenue;

    // 3. Fetch general business expenses & breakdown
    const generalExpenses = await Expense.find({ organizationId }).lean();
    const generalExpensesTotal = generalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalExpenses = clientExpenses + clientCommission + generalExpensesTotal;

    const expenseByCategory: Record<string, number> = {
      SALARY: 0,
      MARKETING: 0,
      SOFTWARE: 0,
      OFFICE: 0,
      COMMISSION: clientCommission,
      CLIENT_COST: clientExpenses,
    };
    generalExpenses.forEach((e) => {
      const cat = e.category || "OFFICE";
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
    });

    // 3. Net Profit & Margin Calculation
    const netProfit = grossRevenue - totalExpenses;
    const netMarginPercent = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : 0;
    const avgDealValue = totalWonLeads > 0 ? Math.round(grossRevenue / totalWonLeads) : 0;

    // 4. Monthly series (last 12 months) — revenue & expenses grouped by month
    //    Client revenue is attributed to the month the client was added (createdAt).
    const monthKey = (d: Date | string | undefined) => {
      const dt = d ? new Date(d) : new Date();
      if (isNaN(dt.getTime())) return "";
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    };

    const monthlyMap = new Map<string, { revenue: number; expenses: number }>();

    // Build an ordered list of the last 12 months (oldest → newest)
    const now = new Date();
    const months: { key: string; label: string; month: number; year: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: monthKey(d),
        label: d.toLocaleString("en-IN", { month: "short" }),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
      monthlyMap.set(monthKey(d), { revenue: 0, expenses: 0 });
    }

    // Revenue from won leads (by their creation month)
    wonLeads.forEach((l) => {
      const k = monthKey(l.createdAt as unknown as string);
      const bucket = monthlyMap.get(k);
      if (bucket) bucket.revenue += l.value || 0;
    });

    // Revenue + client costs + commission from clients (by creation month)
    clients.forEach((c) => {
      const k = monthKey(c.createdAt as unknown as string);
      const bucket = monthlyMap.get(k);
      if (!bucket) return;
      bucket.revenue += c.amountPaid || c.totalAmount || 0;
      bucket.expenses += (c.expenses || 0) + (c.commission || 0);
    });

    // General expenses (by expense date month)
    generalExpenses.forEach((e) => {
      const k = monthKey(e.date as unknown as string);
      const bucket = monthlyMap.get(k);
      if (bucket) bucket.expenses += e.amount || 0;
    });

    const monthly = months.map((m) => {
      const bucket = monthlyMap.get(m.key) || { revenue: 0, expenses: 0 };
      return {
        key: m.key,
        label: m.label,
        month: m.month,
        year: m.year,
        revenue: bucket.revenue,
        expenses: bucket.expenses,
        profit: bucket.revenue - bucket.expenses,
      };
    });

    // 4b. Daily series (last 30 days) — powers the short-range chart filters
    //     (Today / Last 7 Days / Last 30 Days). Same attribution rules as monthly.
    const dayKey = (d: Date | string | undefined) => {
      const dt = d ? new Date(d) : new Date();
      if (isNaN(dt.getTime())) return "";
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    };

    const dailyMap = new Map<string, { revenue: number; expenses: number }>();
    const days: { key: string; label: string; month: number; year: number; day: number }[] = [];
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 29; i >= 0; i--) {
      const d = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - i);
      days.push({
        key: dayKey(d),
        label: String(d.getDate()),
        month: d.getMonth(),
        year: d.getFullYear(),
        day: d.getDate(),
      });
      dailyMap.set(dayKey(d), { revenue: 0, expenses: 0 });
    }

    wonLeads.forEach((l) => {
      const bucket = dailyMap.get(dayKey(l.createdAt as unknown as string));
      if (bucket) bucket.revenue += l.value || 0;
    });

    clients.forEach((c) => {
      const bucket = dailyMap.get(dayKey(c.createdAt as unknown as string));
      if (!bucket) return;
      bucket.revenue += c.amountPaid || c.totalAmount || 0;
      bucket.expenses += (c.expenses || 0) + (c.commission || 0);
    });

    generalExpenses.forEach((e) => {
      const bucket = dailyMap.get(dayKey(e.date as unknown as string));
      if (bucket) bucket.expenses += e.amount || 0;
    });

    const daily = days.map((d) => {
      const bucket = dailyMap.get(d.key) || { revenue: 0, expenses: 0 };
      return {
        key: d.key,
        label: d.label,
        month: d.month,
        year: d.year,
        revenue: bucket.revenue,
        expenses: bucket.expenses,
        profit: bucket.revenue - bucket.expenses,
      };
    });

    // 5. Team count summary
    const activeTeamCount = await TeamMember.countDocuments({ organizationId, status: "active" });

    return Response.json({
      success: true,
      overview: {
        grossRevenue,
        totalExpenses,
        netProfit,
        netMarginPercent: Number(netMarginPercent),
        avgDealValue,
        totalWonLeads,
        activeTeamCount,
        expenseByCategory,
        monthly,
        daily,
        expenses: generalExpenses.map((e: Record<string, any>) => ({ ...e, id: String(e._id) })),
      },
    });
  } catch (error) {
    console.error("Error fetching overview data:", error);
    return Response.json(
      { success: false, error: "Failed to load overview data" },
      { status: 500 }
    );
  }
}
