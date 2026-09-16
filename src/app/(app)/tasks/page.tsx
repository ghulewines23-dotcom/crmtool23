"use client";

import { Clock } from "lucide-react";
import { useCRMData } from "@/lib/crm-data-context";
import type { TaskStatus, Priority } from "@/lib/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

const columns: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "completed", label: "Completed" },
];

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-zinc-100 text-zinc-600" },
  medium: { label: "Medium", className: "bg-blue-50 text-blue-600" },
  high: { label: "High", className: "bg-amber-50 text-amber-600" },
  urgent: { label: "Urgent", className: "bg-red-50 text-red-600" },
};

const columnAccent: Record<TaskStatus, string> = {
  todo: "border-t-zinc-300",
  in_progress: "border-t-blue-400",
  review: "border-t-amber-400",
  completed: "border-t-emerald-400",
};

export default function TasksPage() {
  const { tasks } = useCRMData();
  
  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">Tasks</h1>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="min-w-[280px] flex-1">
              <Card className={cn("border-t-2", columnAccent[col.status])}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[13px] font-semibold">{col.label}</CardTitle>
                    <Badge variant="outline" className="text-[11px]">
                      {colTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {colTasks.map((task) => {
                    const priority = priorityConfig[task.priority];
                    return (
                      <div key={task.id} className="rounded-lg border border-border p-3.5 transition-colors hover:bg-muted/30">
                        <p className="text-[13px] font-medium">{task.title}</p>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          {task.client} · {task.project}
                        </p>

                        <div className="mt-3 flex items-center justify-between">
                          <Badge variant="outline" className={cn("text-[10px] font-medium", priority.className)}>
                            {priority.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {task.dueDate}
                          </div>
                        </div>

                        <div className="mt-2.5 border-t border-border pt-2.5">
                          <p className="text-[12px] text-muted-foreground">
                            Assigned to <span className="font-medium text-foreground">{task.assignedToName}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-[12px] text-muted-foreground">No tasks</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
