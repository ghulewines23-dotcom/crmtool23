"use client"
import { useAuth } from "@/lib/auth-context"
import { useCRMData } from "@/lib/crm-data-context"

export default function PlatformProjectsPage() {
  const { user } = useAuth()
  const { projects } = useCRMData()
  const orgProjects = projects.filter((p) => p.organizationId === user?.organizationId)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Projects</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {orgProjects.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-medium">{p.projectName}</h3>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-600"}`}>{p.status}</span>
            </div>
            <p className="text-[12px] text-muted-foreground">{p.clientName} &middot; {p.service}</p>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.progress}%` }} /></div>
            <p className="text-[11px] text-muted-foreground">{p.progress}% complete &middot; Due {p.deadline}</p>
          </div>
        ))}
      </div>
      {orgProjects.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No projects</p>}
    </div>
  )
}
