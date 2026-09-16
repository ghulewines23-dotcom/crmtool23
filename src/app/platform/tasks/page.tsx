"use client"
import { useAuth } from "@/lib/auth-context"
import { useCRMData } from "@/lib/crm-data-context"

export default function PlatformTasksPage() {
  const { user } = useAuth()
  const { tasks } = useCRMData()
  const orgTasks = tasks.filter((t) => t.organizationId === user?.organizationId)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tasks</h1>
      <div className="rounded-lg border border-border bg-white overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Title</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Assigned To</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Priority</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground hidden md:table-cell">Due Date</th>
          </tr></thead>
          <tbody>
            {orgTasks.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-[13px] font-medium">{t.title}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{t.assignedToName}</td>
                <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${t.priority === "urgent" ? "bg-red-50 text-red-700" : t.priority === "high" ? "bg-orange-50 text-orange-700" : "bg-gray-50 text-gray-600"}`}>{t.priority}</span></td>
                <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${t.status === "completed" ? "bg-emerald-50 text-emerald-700" : t.status === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600"}`}>{t.status.replace("_", " ")}</span></td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{t.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orgTasks.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No tasks</p>}
      </div>
    </div>
  )
}
