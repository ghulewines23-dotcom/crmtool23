"use client";

import { TrendingUp, IndianRupee, BarChart3 } from "lucide-react";
import { useCRMData } from "@/lib/crm-data-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const months = ["May", "Jun", "Jul", "Aug", "Sep"];
const revenueOverTime = [85000, 120000, 95000, 170000, 0];

export default function ReportsPage() {
  const { leads } = useCRMData();

  const wonLeads = leads.filter((l) => l.status === "won");
  const totalRevenue = wonLeads.reduce((s, l) => s + l.value, 0);
  const avgDealValue =
    wonLeads.length > 0 ? Math.round(totalRevenue / wonLeads.length) : 0;
  const conversionRate =
    leads.length > 0
      ? Math.round((wonLeads.length / leads.length) * 100)
      : 0;
  const maxRevenue = Math.max(...revenueOverTime, totalRevenue);

  const leadSources = [
    { name: "Google", count: leads.filter((l) => l.source === "Google").length },
    {
      name: "Referral",
      count: leads.filter((l) => l.source === "Referral").length,
    },
    {
      name: "Facebook",
      count: leads.filter((l) => l.source === "Facebook").length,
    },
    {
      name: "Instagram",
      count: leads.filter((l) => l.source === "Instagram").length,
    },
    {
      name: "LinkedIn",
      count: leads.filter((l) => l.source === "LinkedIn").length,
    },
    {
      name: "Website",
      count: leads.filter((l) => l.source === "Website").length,
    },
    {
      name: "Cold Call",
      count: leads.filter((l) => l.source === "Cold Call").length,
    },
  ]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxSourceCount = Math.max(...leadSources.map((s) => s.count), 1);

  const stats = [
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      label: "Revenue",
      value: `₹${totalRevenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-blue-500",
    },
    {
      label: "Avg Deal",
      value: `₹${avgDealValue.toLocaleString("en-IN")}`,
      icon: BarChart3,
      color: "text-violet-500",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">
        Reports
      </h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex items-end gap-3"
              style={{ height: 180 }}
            >
              {revenueOverTime.map((value, i) => (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-[11px] font-medium text-muted-foreground">
                    ₹{(value / 1000).toFixed(0)}k
                  </span>
                  <div
                    className="w-full rounded-t-md bg-foreground/10 transition-all"
                    style={{
                      height: `${(value / maxRevenue) * 120}px`,
                    }}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {months[i]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leadSources.map((source) => (
                <div
                  key={source.name}
                  className="flex items-center gap-3"
                >
                  <span className="w-16 shrink-0 text-right text-[12px] text-muted-foreground">
                    {source.name}
                  </span>
                  <div className="flex-1">
                    <div className="h-6 rounded-md bg-muted">
                      <div
                        className="h-full rounded-md bg-foreground/10 transition-all flex items-center px-2"
                        style={{
                          width: `${(source.count / maxSourceCount) * 100}%`,
                        }}
                      >
                        <span className="text-[11px] font-medium text-foreground">
                          {source.count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
