"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PlatformUser {
  _id: string
  id: string
  name: string
  email: string
  role: string
  status: string
  organizationId: string
  organizations: { organizationId: string; role: string; joinedAt: string }[]
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
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)

    try {
      const res = await fetch(`/api/platform/users?${params}`, { credentials: "same-origin" })
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      // silent
    }
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

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
      if (data.success) {
        setSelectedUser(null)
        fetchUsers()
      }
    } catch {
      // silent
    }
    setSaving(false)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Users ({total})</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending_access">Pending</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">User ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">CRM</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{u._id.slice(0, 12)}...</td>
                  <td className="px-4 py-3 font-medium text-[#1a1a1a]">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.role}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${u.canAccessCRM ? "text-green-600" : "text-gray-400"}`}>
                      {u.canAccessCRM ? "ON" : "OFF"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Manage
                    </button>
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
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Management Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-lg overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h3 className="text-lg font-semibold text-[#1a1a1a]">Manage User</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* User Details */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-gray-900">User Details</h4>
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                  <Row label="User ID" value={selectedUser._id} />
                  <Row label="Name" value={selectedUser.name} />
                  <Row label="Email" value={selectedUser.email} />
                  <Row label="Created" value={formatDate(selectedUser.createdAt)} />
                </div>
              </div>

              {/* Access Control */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-gray-900">Access Control</h4>
                <div className="space-y-3">
                  <Toggle
                    label="CRM Access"
                    checked={selectedUser.canAccessCRM}
                    onChange={(v) => setSelectedUser({ ...selectedUser, canAccessCRM: v })}
                  />
                  <Toggle
                    label="Create Organization"
                    checked={selectedUser.canCreateOrganization}
                    onChange={(v) => setSelectedUser({ ...selectedUser, canCreateOrganization: v })}
                  />
                  <Toggle
                    label="Join Organization"
                    checked={selectedUser.canJoinOrganization}
                    onChange={(v) => setSelectedUser({ ...selectedUser, canJoinOrganization: v })}
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-gray-900">Role</h4>
                <select
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="SALES_PERSON">SALES_PERSON</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="FOUNDER">FOUNDER</option>
                </select>
              </div>

              {/* Account Status */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-gray-900">Account Status</h4>
                <select
                  value={selectedUser.status}
                  onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="pending_access">PENDING_ACCESS</option>
                  <option value="active">ACTIVE</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button onClick={saveUser} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedUser(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-50 text-green-700",
    pending_access: "bg-yellow-50 text-yellow-700",
    suspended: "bg-red-50 text-red-700",
    inactive: "bg-gray-100 text-gray-600",
    invited: "bg-blue-50 text-blue-700",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono text-xs text-[#1a1a1a] break-all max-w-[60%] text-right">{value}</span>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <span className="text-sm text-[#1a1a1a]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-green-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}
