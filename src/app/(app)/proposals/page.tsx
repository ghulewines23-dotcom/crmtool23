"use client";

import { FileText } from "lucide-react";
import { useCRMData } from "@/lib/crm-data-context";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ProposalsPage() {
  const { proposals } = useCRMData();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">Proposals</h1>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-muted-foreground">ID</th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-muted-foreground">Client</th>
                  <th className="px-5 py-3 text-right text-[12px] font-medium text-muted-foreground">Amount</th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-muted-foreground">Created</th>
                  <th className="px-5 py-3 text-center text-[12px] font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr key={proposal.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 text-[13px] font-medium">{proposal.id}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-[13px]">{proposal.client}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-[13px] font-semibold">₹{proposal.amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{proposal.created}</td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={proposal.status} />
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
