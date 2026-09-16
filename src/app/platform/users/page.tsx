"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, X, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PlatformUser {
  _id: string
  name: string
  email: string
  role: string
  status: string
  canAccessCRM: boolean
  canCreateOrganization: boolean
  canJoinOrganization: boolean
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    try {
      const res = await fetch(`/api/platform/users?${params}`, { credentials: "same-origin" })
      const data = await res.json()
      const filtered = (data.users || []).filter((u: PlatformUser) => u.role !== "SERENE_OWNER")
      setUsers(filtered)
      setTotal(filtered.length)
      setTotalPages(Math.ceil(filtered.length / 20))
    } catch { /* silent */ }
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    if (selected.length === users.length) {
      setSelected([])
    } else {
      setSelected(users.map((u) => u._id))
    }
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.length} users?`)) return
    setDeleting(true)
    try {
      for (const id of selected) {
        await fetch(`/api/platform/users/${id}`, { method: "DELETE", credentials: "same-origin" })
      }
      setSelected([])
      fetchUsers()
    } catch { /* silent */ }
    setDeleting(false)
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return
    try {
      await fetch(`/api/platform/users/${id}`, { method: "DELETE", credentials: "same-origin" })
      fetchUsers()
    } catch { /* silent */ }
  }

  async function saveUser() {
    if (!selectedUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/platform/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          status: selectedUser.status,
          role: selectedUser.role,
          canAccessCRM: selectedUser.canAccessCRM,
          canCreateOrganization: selectedUser.canCreateOrganization,
          canJoinOrganization: selectedUser.canJoinOrganization,
        }),
      })
      const data = await res.json()
      if (data.success) { setSelectedUser(null); fetchUsers() }
    } catch { /* silent */ }
    setSaving(false)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-white">Users</h2>
          {selected.length > 0 && (
            <button
              onClick={bulkDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selected.length})
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 w-48 bg-[#111] border-gray-800 text-white placeholder:text-gray-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-800 bg-[#111] px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="">All</option>
            <option value="pending_access">Pending</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-800 bg-[#111] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-3 py-2.5 text-left">
                <input
                  type="checkbox"
                  checked={selected.length === users.length && users.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-600 bg-transparent"
                />
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Email</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Role</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">CRM</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Created</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-12 text-center text-gray-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-12 text-center text-gray-500">No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(u._id)}
                      onChange={() => toggleSelect(u._id)}
                      className="rounded border-gray-600 bg-transparent"
                    />
                  </td>
                  <td className="px-3 py-2 text-white">{u.name}</td>
                  <td className="px-3 py-2 text-gray-400">{u.email}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{u.role}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs ${u.canAccessCRM ? "text-emerald-400" : "text-gray-600"}`}>
                      {u.canAccessCRM ? "ON" : "OFF"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelectedUser(u)} className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">Edit</button>
                      <button onClick={() => deleteUser(u._id)} className="rounded p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded p-1.5 text-gray-400 hover:bg-gray-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded p-1.5 text-gray-400 hover:bg-gray-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Edit Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-sm overflow-y-auto bg-[#111] border-l border-gray-800">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-[#111] px-4 py-3">
              <h3 className="text-sm font-medium text-white">Edit User</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-gray-300"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-4">
              {/* Info */}
              <div className="space-y-1.5 rounded-lg border border-gray-800 p-3 text-xs">
                <InfoRow label="ID" value={selectedUser._id} />
                <InfoRow label="Name" value={selectedUser.name} />
                <InfoRow label="Email" value={selectedUser.email} />
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400">Permissions</p>
                <Toggle label="CRM Access" checked={selectedUser.canAccessCRM} onChange={(v) => setSelectedUser({ ...selectedUser, canAccessCRM: v })} />
                <Toggle label="Create Organization" checked={selectedUser.canCreateOrganization} onChange={(v) => setSelectedUser({ ...selectedUser, canCreateOrganization: v })} />
                <Toggle label="Join Organization" checked={selectedUser.canJoinOrganization} onChange={(v) => setSelectedUser({ ...selectedUser, canJoinOrganization: v })} />
              </div>

              {/* Role */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1.5">Role</p>
                <select value={selectedUser.role} onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })} className="w-full rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-white">
                  <option value="SALES_PERSON">SALES_PERSON</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="FOUNDER">FOUNDER</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1.5">Status</p>
                <select value={selectedUser.status} onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })} className="w-full rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-white">
                  <option value="pending_access">PENDING</option>
                  <option value="active">ACTIVE</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={saveUser} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0">{saving ? "Saving..." : "Save"}</Button>
                <Button variant="outline" onClick={() => setSelectedUser(null)} className="flex-1 border-gray-800 text-gray-300 hover:bg-gray-800">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
  return <span className={`text-xs px-2 py-0.5 rounded-full ${s}`}>{status}</span>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-mono break-all max-w-[60%] text-right">{value}</span>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-lg border border-gray-800 px-3 py-2 hover:bg-white/[0.02]">
      <span className="text-xs text-gray-300">{label}</span>
      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-gray-700"}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </button>
  )
}
