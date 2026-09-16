"use client";

import { Calendar, FolderOpen } from "lucide-react";
import { useCRMData } from "@/lib/crm-data-context";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress, ProgressIndicator } from "@/components/ui/progress";
import { cn } from "cn";

export default function ProjectsPage() {
  const { projects } = useCRMData();
  
  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-semibold tracking-tight">Projects</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="transition-colors hover:bg-muted/20">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-semibold">{project.projectName}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{project.clientName}</p>
                </div>
                <StatusBadge status={project.status} />
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <FolderOpen className="h-3.5 w-3.5" />
                {project.service}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="mt-1.5 h-1.5">
                  <ProgressIndicator
                    className={cn(
                      project.progress === 100
                        ? "bg-emerald-500"
                        : project.progress >= 75
                          ? "bg-blue-500"
                          : project.progress >= 50
                            ? "bg-amber-500"
                            : "bg-violet-500"
                    )}
                  />
                </Progress>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {project.deadline}
                </div>
                <div className="flex -space-x-2">
                  {project.team.map((member, i) => {
                    const initials = member.split(" ").map((n) => n[0]).join("").toUpperCase();
                    return (
                      <Avatar key={i} className="h-7 w-7 border-2 border-white">
                        <AvatarFallback className="bg-muted text-[10px] font-medium text-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
