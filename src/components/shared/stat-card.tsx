"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  title: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  className?: string;
}

export function StatCard({ icon, value, title, change, changeType, className }: StatCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-white p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      {change && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {changeType === "positive" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
          {changeType === "negative" && <TrendingDown className="h-3 w-3 text-red-500" />}
          {changeType === "neutral" && <Minus className="h-3 w-3" />}
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}
