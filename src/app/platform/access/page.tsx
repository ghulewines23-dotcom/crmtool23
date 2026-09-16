"use client"

import { useEffect, useState, useCallback } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface User {
  _id: string
  name: string
  email: string
  role: string
  status: string
  canAccessCRM: boolean
  canCreateOrganization: boolean
  canJoinOrganization: boolean
}

export default function AccessControlPage() {
  const [users, setUsers] = useState<User[]>([])
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
      setUsers((data.users || []).filter((u: User) => u.role !== "SERENE_OWNER"))
    } catch { /* silent */ }
    setLoading(false)
  }, [search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function toggle(userId: string, field: string, value: boolean) {
    setSaving(userId)
    try {
      await fetch(`/api/platform/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ [field]: value }),
      })
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, [field]: value } : u))
    } catch { /* silent */ }
    setSaving(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-white">Access Control</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-48 bg-[#111] border-gray-800 text-white placeholder:text-gray-600" />
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-[#111] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">User</th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">CRM</th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Create Org</th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">Join Org</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-12 text-center text-gray-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-12 text-center text-gray-500">No users.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2">
                    <p className="text-white">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Pill checked={u.canAccessCRM} disabled={saving === u._id} onChange={(v) => toggle(u._id, "canAccessCRM", v)} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Pill checked={u.canCreateOrganization} disabled={saving === u._id} onChange={(v) => toggle(u._id, "canCreateOrganization", v)} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Pill checked={u.canJoinOrganization} disabled={saving === u._id} onChange={(v) => toggle(u._id, "canJoinOrganization", v)} />
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

function Pill({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-emerald-600" : "bg-gray-700"}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  )
}
