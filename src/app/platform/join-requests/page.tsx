"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface JoinReq {
  _id: string
  userId: string
  userName: string
  userEmail: string
  organizationId: string
  organizationName: string
  status: string
  createdAt: string
}

export default function JoinRequestsPage() {
  const [requests, setRequests] = useState<JoinReq[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/platform/join-requests?limit=100", { credentials: "same-origin" })
      const data = await res.json()
      setRequests(data.requests || [])
      setTotal(data.total || 0)
    } catch {
      // silent
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setProcessing(requestId)
    try {
      const res = await fetch("/api/platform/join-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ requestId, action }),
      })
      const data = await res.json()
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) =>
            r._id === requestId ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r
          )
        )
      }
    } catch {
      // silent
    }
    setProcessing(null)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#1a1a1a]">Join Requests ({total})</h2>

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Request ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Organization</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Requested</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">Loading...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No join requests.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r._id.slice(0, 12)}...</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1a1a1a]">{r.userName}</p>
                    <p className="text-xs text-gray-500">{r.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.organizationName}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "approved" ? "bg-green-50 text-green-700" :
                      r.status === "rejected" ? "bg-red-50 text-red-700" :
                      "bg-yellow-50 text-yellow-700"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={processing === r._id}
                          onClick={() => handleAction(r._id, "approve")}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processing === r._id}
                          onClick={() => handleAction(r._id, "reject")}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
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
