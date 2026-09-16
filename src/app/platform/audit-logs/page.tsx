"use client"

import { useEffect, useState, useCallback } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface AuditEntry {
  _id: string
  actorEmail: string
  action: string
  targetType: string | null
  targetId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
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
      setTotal(data.total || 0)
    } catch {
      // silent
    }
    setLoading(false)
  }, [actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function formatTimestamp(d: string) {
    return new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const ACTION_LABELS: Record<string, string> = {
    USER_SIGNUP: "User Signup",
    USER_APPROVED: "User Approved",
    USER_SUSPENDED: "User Suspended",
    CRM_ACCESS_CHANGED: "CRM Access Changed",
    CREATE_ORGANIZATION_ACCESS_CHANGED: "Create Org Access Changed",
    JOIN_ORGANIZATION_ACCESS_CHANGED: "Join Org Access Changed",
    ROLE_CHANGED: "Role Changed",
    JOIN_REQUEST_APPROVED: "Join Request Approved",
    JOIN_REQUEST_REJECTED: "Join Request Rejected",
    ORG_CREATED: "Organization Created",
    ORG_STATUS_CHANGED: "Organization Status Changed",
    PLAN_CHANGED: "Plan Changed",
    PAYMENT_APPROVED: "Payment Approved",
    PAYMENT_REJECTED: "Payment Rejected",
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Audit Logs ({total})</h2>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Timestamp</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Target</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">No audit logs.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatTimestamp(log.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{log.actorEmail}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.targetType && <span>{log.targetType}</span>}
                    {log.targetId && <span className="ml-1 font-mono text-xs text-gray-400">{log.targetId.slice(0, 8)}...</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
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
