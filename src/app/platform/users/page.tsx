"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, X, Trash2, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PlatformUser {
  _id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
  rejectedAt?: string | null
}

const REJECTION_RETENTION_DAYS = 5
/** Whole days left before a rejected user is auto-deleted. */
function daysLeft(rejectedAt?: string | null): number {
  if (!rejectedAt) return REJECTION_RETENTION_DAYS
  const elapsedMs = Date.now() - new Date(rejectedAt).getTime()
  const left = REJECTION_RETENTION_DAYS - Math.floor(elapsedMs / (24 * 60 * 60 * 1000))
  return Math.max(0, left)
}

function formatRole(role: string): string {
  return role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

export default function UsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: "1", limit: "100" })
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    try {
      const res = await fetch(`/api/platform/users?${params}`, { credentials: "same-origin" })
      const data = await res.json()
      const filtered = (data.users || []).filter((u: PlatformUser) => u.role !== "SERENE_OWNER")
      setUsers(filtered)
    } catch { /* silent */ }
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function toggleSelectAll() {
    if (selected.length === users.length) { setSelected([]) } else { setSelected(users.map((u) => u._id)) }
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

  async function approveUser(user: PlatformUser) {
    try {
      await fetch(`/api/platform/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: "active", role: user.role }),
      })
      fetchUsers()
    } catch { /* silent */ }
  }

  async function rejectUser(user: PlatformUser) {
    if (!confirm(`Reject ${user.name}? The account will be auto-deleted after ${REJECTION_RETENTION_DAYS} days.`)) return
    try {
      await fetch(`/api/platform/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: "rejected", role: user.role }),
      })
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

  const pendingCount = users.filter((u) => u.status === "pending_access").length
  const rejectedUsers = users.filter((u) => u.status === "rejected")

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-white">Users</h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
              {pendingCount} pending
            </span>
          )}
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
              onChange={(e) => { setSearch(e.target.value) }}
              className="pl-9 w-48 bg-[#111] border-gray-800 text-white placeholder:text-gray-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-800 bg-[#111] px-3 py-1.5 text-sm text-gray-300"
          >
            <option value="">All</option>
            <option value="pending_access">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Pending users section */}
      {pendingCount > 0 && !statusFilter && (
        <div className="rounded-lg border border-amber-800/30 bg-amber-500/5 p-4">
          <h3 className="text-sm font-medium text-amber-400 mb-3">Pending Approval</h3>
          <div className="space-y-2">
            {users.filter((u) => u.status === "pending_access").map((u) => (
              <div key={u._id} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#111] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-xs font-medium text-amber-400">
                    {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email} &middot; {formatRole(u.role)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveUser(u)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => rejectUser(u)}
                    className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected users — auto-delete countdown */}
      {rejectedUsers.length > 0 && !statusFilter && (
        <div className="rounded-lg border-red-800/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-red-400">Rejected</h3>
            <span className="text-xs text-gray-500">Auto-deleted {REJECTION_RETENTION_DAYS} days after rejection</span>
          </div>
          <div className="space-y-2">
            {rejectedUsers.map((u) => {
              const left = daysLeft(u.rejectedAt)
              return (
                <div key={u._id} className="flex items-center justify-between rounded-lg border-gray-800 bg-[#111] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-xs font-medium text-red-400">
                      {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{u.name}</p>
                      <p className="text-xs text-gray-500">
                        {u.email} &middot; {formatRole(u.role)} &middot;{" "}
                        <span className={left <= 1 ? "text-red-400" : "text-amber-400"}>
                          {left === 0 ? "deleting soon" : `deletes in ${left} day${left === 1 ? "" : "s"}`}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveUser(u)}
                      className="rounded-lg border-emerald-800/40 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => deleteUser(u._id)}
                      className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete now
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Created</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-12 text-center text-gray-500">Loading...</td></tr>
            ) : users.filter((u) => u.status !== "pending_access" && u.status !== "rejected").length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-12 text-center text-gray-500">No active users found.</td></tr>
            ) : (
              users.filter((u) => u.status !== "pending_access" && u.status !== "rejected").map((u) => (
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
                  <td className="px-3 py-2 text-gray-400 text-xs">{formatRole(u.role)}</td>
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
              <div className="space-y-1.5 rounded-lg border border-gray-800 p-3 text-xs">
                <InfoRow label="Name" value={selectedUser.name} />
                <InfoRow label="Email" value={selectedUser.email} />
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 mb-1.5">Role</p>
                <select value={selectedUser.role} onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })} className="w-full rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-white">
                  <option value="SALES_PERSON">Sales Person</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 mb-1.5">Status</p>
                <select value={selectedUser.status} onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })} className="w-full rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-2 text-sm text-white">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
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
  const cls = status === "active"
    ? "bg-emerald-500/10 text-emerald-400"
    : status === "suspended"
    ? "bg-red-500/10 text-red-400"
    : "bg-yellow-500/10 text-yellow-400"
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-mono break-all max-w-[60%] text-right">{value}</span>
    </div>
  )
}
