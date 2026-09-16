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

    // 1. Fetch Clients to calculate Client Revenue & Client Project Expenses
    const clients = await Client.find({ organizationId }).select("totalAmount amountPaid expenses name").lean();
    const clientRevenue = clients.reduce((sum, c) => sum + (c.amountPaid || c.totalAmount || 0), 0);
    const clientExpenses = clients.reduce((sum, c) => sum + (c.expenses || 0), 0);

    // 2. Fetch Won Leads revenue
    const wonLeads = await Lead.find({ organizationId, status: "won" }).select("value name company").lean();
    const wonLeadsRevenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    const totalWonLeads = wonLeads.length;

    const grossRevenue = clientRevenue + wonLeadsRevenue;

    // 3. Fetch general business expenses & breakdown
    const generalExpenses = await Expense.find({ organizationId }).lean();
    const generalExpensesTotal = generalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalExpenses = clientExpenses + generalExpensesTotal;

    const expenseByCategory: Record<string, number> = {
      SALARY: 0,
      MARKETING: 0,
      SOFTWARE: 0,
      OFFICE: 0,
      MISC: clientExpenses,
    };
    generalExpenses.forEach((e) => {
      const cat = e.category || "MISC";
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
    });

    // 3. Net Profit & Margin Calculation
    const netProfit = grossRevenue - totalExpenses;
    const netMarginPercent = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : 0;
    const avgDealValue = totalWonLeads > 0 ? Math.round(grossRevenue / totalWonLeads) : 0;

    // 4. Team count summary
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
