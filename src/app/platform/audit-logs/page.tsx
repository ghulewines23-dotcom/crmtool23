"use client"

import { useEffect, useState, useCallback } from "react"

interface AuditEntry {
  _id: string
  actorEmail: string
  action: string
  targetType: string | null
  targetId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  USER_SIGNUP: "Signup",
  USER_APPROVED: "Approved",
  USER_DELETED: "Deleted",
  CRM_ACCESS_CHANGED: "CRM Access",
  CREATE_ORGANIZATION_ACCESS_CHANGED: "Create Org",
  JOIN_ORGANIZATION_ACCESS_CHANGED: "Join Org",
  ROLE_CHANGED: "Role Changed",
  USER_LOGIN: "Login",
  USER_LOGIN_FAILED: "Login Failed",
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState("")

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: "100" })
    if (actionFilter) params.set("action", actionFilter)
    try {
      const res = await fetch(`/api/platform/audit-logs?${params}`, { credentials: "same-origin" })
      const data = await res.json()
      setLogs(data.logs || [])
    } catch { /* silent */ }
    setLoading(false)
  }, [actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  function fmt(d: string) {
    return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-white">Audit Logs</h2>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-lg border border-gray-800 bg-[#111] px-3 py-1.5 text-sm text-gray-300">
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-gray-800 bg-[#111] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Time</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Actor</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Action</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr><td colSpan={4} className="px-3 py-12 text-center text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-12 text-center text-gray-500">No logs.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{fmt(log.createdAt)}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{log.actorEmail}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{ACTION_LABELS[log.action] || log.action}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">
                    {log.metadata?.change ? String(log.metadata.change) : log.metadata?.userName ? String(log.metadata.userName) : "—"}
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
