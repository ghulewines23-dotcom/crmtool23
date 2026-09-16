"use client"

import { useEffect, useState } from "react"
import { Users, Building2, UserCheck, Clock } from "lucide-react"

interface Stats {
  totalUsers: number
  pendingUsers: number
  activeUsers: number
  suspendedUsers: number
  organizations: number
  pendingJoinRequests: number
}

interface RecentUser {
  _id: string
  name: string
  email: string
  status: string
  createdAt: string
}

interface RecentOrg {
  _id: string
  name: string
  status: string
  founderId: string
  createdAt: string
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentOrgs, setRecentOrgs] = useState<RecentOrg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, orgsRes, joinRes] = await Promise.all([
          fetch("/api/platform/users?limit=200", { credentials: "same-origin" }),
          fetch("/api/platform/organizations?limit=200", { credentials: "same-origin" }),
          fetch("/api/platform/join-requests?status=pending&limit=200", { credentials: "same-origin" }),
        ])

        const usersData = await usersRes.json()
        const orgsData = await orgsRes.json()
        const joinData = await joinRes.json()

        const users = usersData.users || []
        const orgs = orgsData.organizations || []

        setStats({
          totalUsers: users.length,
          pendingUsers: users.filter((u: { status: string }) => u.status === "pending_access").length,
          activeUsers: users.filter((u: { status: string }) => u.status === "active").length,
          suspendedUsers: users.filter((u: { status: string }) => u.status === "suspended").length,
          organizations: orgs.length,
          pendingJoinRequests: joinData.total || 0,
        })

        setRecentUsers(users.slice(0, 5))
        setRecentOrgs(orgs.slice(0, 5))
      } catch {
        // silent
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "bg-gray-100 text-gray-600" },
    { label: "Pending Users", value: stats?.pendingUsers ?? 0, icon: Clock, color: "bg-yellow-50 text-yellow-600" },
    { label: "Active Users", value: stats?.activeUsers ?? 0, icon: Users, color: "bg-green-50 text-green-600" },
    { label: "Suspended", value: stats?.suspendedUsers ?? 0, icon: Users, color: "bg-red-50 text-red-600" },
    { label: "Organizations", value: stats?.organizations ?? 0, icon: Building2, color: "bg-blue-50 text-blue-600" },
    { label: "Pending Join Requests", value: stats?.pendingJoinRequests ?? 0, icon: UserCheck, color: "bg-purple-50 text-purple-600" },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[#1a1a1a]">Overview</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-semibold text-[#1a1a1a]">{card.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Signups */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-medium text-[#1a1a1a]">Recent Signups</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentUsers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No users yet.</p>
            ) : (
              recentUsers.map((u) => (
                <div key={u._id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === "active"
                        ? "bg-green-50 text-green-700"
                        : u.status === "pending_access"
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Organizations */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-medium text-[#1a1a1a]">Recent Organizations</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrgs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No organizations yet.</p>
            ) : (
              recentOrgs.map((o) => (
                <div key={o._id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">{o.name}</p>
                    <p className="text-xs text-gray-500">{o.founderId}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      o.status === "ACTIVE"
                        ? "bg-green-50 text-green-700"
                        : o.status === "TRIAL"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
