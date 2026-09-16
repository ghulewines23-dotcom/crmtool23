"use client";

import { Phone, Target, FileText, CheckSquare, CreditCard, Calendar, Mail, ArrowRightLeft, StickyNote } from "lucide-react";
import { cn } from "cn";
import { useCRMData } from "@/lib/crm-data-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const typeConfig: Record<string, { icon: React.ElementType; color: string; badgeClass: string }> = {
  call: { icon: Phone, color: "bg-emerald-500", badgeClass: "bg-emerald-50 text-emerald-600" },
  lead: { icon: Target, color: "bg-blue-500", badgeClass: "bg-blue-50 text-blue-600" },
  proposal: { icon: FileText, color: "bg-violet-500", badgeClass: "bg-violet-50 text-violet-600" },
  task: { icon: CheckSquare, color: "bg-amber-500", badgeClass: "bg-amber-50 text-amber-600" },
  payment: { icon: CreditCard, color: "bg-emerald-500", badgeClass: "bg-emerald-50 text-emerald-600" },
  meeting: { icon: Calendar, color: "bg-blue-500", badgeClass: "bg-blue-50 text-blue-600" },
  email: { icon: Mail, color: "bg-cyan-500", badgeClass: "bg-cyan-50 text-cyan-600" },
  status_change: { icon: ArrowRightLeft, color: "bg-orange-500", badgeClass: "bg-orange-50 text-orange-600" },
  note: { icon: StickyNote, color: "bg-zinc-400", badgeClass: "bg-zinc-100 text-zinc-600" },
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function ActivityPage() {
  const { activities } = useCRMData();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">Activity</h1>

      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-6">
              {activities.map((activity) => {
                const config = typeConfig[activity.type] || typeConfig.note;
                const Icon = config.icon;
                return (
                  <div key={activity.id} className="relative flex gap-4">
                    <div className={cn("relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-medium">{activity.user}</span>
                        <span className="text-[13px] text-muted-foreground">{activity.action}</span>
                        <span className="text-[13px] font-medium">{activity.target}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant="outline" className={cn("capitalize text-[11px]", config.badgeClass)}>
                          {activity.type.replace("_", " ")}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{formatTimestamp(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
