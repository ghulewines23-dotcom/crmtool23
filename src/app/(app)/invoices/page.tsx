"use client";

import { useState } from "react";
import { Receipt, DollarSign, Clock } from "lucide-react";
import { useCRMData } from "@/lib/crm-data-context";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";

export default function InvoicesPage() {
  const { invoices } = useCRMData();
  
  const stats = [
    { label: "Total Invoiced", value: invoices.reduce((s, i) => s + i.amount, 0), icon: Receipt, color: "text-blue-500" },
    { label: "Paid", value: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0), icon: DollarSign, color: "text-emerald-500" },
    { label: "Pending", value: invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0), icon: Clock, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">Invoices</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold">₹{stat.value.toLocaleString("en-IN")}</p>
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-muted-foreground">Invoice #</th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-muted-foreground">Client</th>
                  <th className="px-5 py-3 text-right text-[12px] font-medium text-muted-foreground">Amount</th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-muted-foreground">Date</th>
                  <th className="px-5 py-3 text-center text-[12px] font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 text-[13px] font-medium">{invoice.number}</td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{invoice.client}</td>
                    <td className="px-5 py-3.5 text-right text-[13px] font-semibold">₹{invoice.amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{invoice.issueDate}</td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
