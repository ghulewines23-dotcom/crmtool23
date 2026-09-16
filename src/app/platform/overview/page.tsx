"use client"

import { useEffect, useState } from "react"
import { Users, Clock, CheckCircle2 } from "lucide-react"

interface Stats {
  totalUsers: number
  pendingUsers: number
  activeUsers: number
}

interface RecentUser {
  _id: string
  name: string
  email: string
  status: string
  createdAt: string
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/platform/users?limit=200", { credentials: "same-origin" })
        const data = await res.json()
        const users = data.users || []

        setStats({
          totalUsers: users.length,
          pendingUsers: users.filter((u: { status: string }) => u.status === "pending_access").length,
          activeUsers: users.filter((u: { status: string }) => u.status === "active").length,
        })

        setRecentUsers(users.slice(0, 5))
      } catch { /* silent */ }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-emerald-500" />
      </div>
    )
  }

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, accent: "text-gray-300" },
    { label: "Pending", value: stats?.pendingUsers ?? 0, icon: Clock, accent: "text-yellow-400" },
    { label: "Active", value: stats?.activeUsers ?? 0, icon: CheckCircle2, accent: "text-emerald-400" },
  ]

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-white">Overview</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-800 bg-[#111] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-2xl font-semibold text-white">{card.value}</p>
              </div>
              <card.icon className={`h-5 w-5 ${card.accent}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-800 bg-[#111]">
        <div className="border-b border-gray-800 px-4 py-3">
          <h3 className="text-sm font-medium text-white">Recent Signups</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {recentUsers.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">No users yet.</p>
          ) : (
            recentUsers.map((u) => (
              <div key={u._id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm text-white">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                  {u.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
