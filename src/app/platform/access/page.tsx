"use client"

import { useEffect, useState, useCallback } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface User {
  _id: string
  name: string
  email: string
  role: string
  status: string
  organizationId: string
  canAccessCRM: boolean
  canCreateOrganization: boolean
  canJoinOrganization: boolean
}

export default function AccessControlPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: "100" })
    if (search) params.set("search", search)

    try {
      const res = await fetch(`/api/platform/users?${params}`, { credentials: "same-origin" })
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch {
      // silent
    }
    setLoading(false)
  }, [search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function togglePermission(userId: string, field: string, value: boolean) {
    setSaving(userId)
    try {
      await fetch(`/api/platform/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ [field]: value }),
      })
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, [field]: value } : u))
      )
    } catch {
      // silent
    }
    setSaving(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Access Control ({total})</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">CRM</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Create Org</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Join Org</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1a1a1a]">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === "active" ? "bg-green-50 text-green-700" :
                      u.status === "pending_access" ? "bg-yellow-50 text-yellow-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PermToggle
                      checked={u.canAccessCRM}
                      disabled={saving === u._id}
                      onChange={(v) => togglePermission(u._id, "canAccessCRM", v)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PermToggle
                      checked={u.canCreateOrganization}
                      disabled={saving === u._id}
                      onChange={(v) => togglePermission(u._id, "canCreateOrganization", v)}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PermToggle
                      checked={u.canJoinOrganization}
                      disabled={saving === u._id}
                      onChange={(v) => togglePermission(u._id, "canJoinOrganization", v)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PermToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-green-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}
