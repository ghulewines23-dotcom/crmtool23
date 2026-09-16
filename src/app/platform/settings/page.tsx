"use client"

import { useAuth } from "@/lib/auth-context"

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-5 max-w-lg">
      <h2 className="text-base font-semibold text-white">Settings</h2>

      <div className="rounded-lg border border-gray-800 bg-[#111]">
        <div className="border-b border-gray-800 px-4 py-3">
          <h3 className="text-sm font-medium text-white">Owner Account</h3>
        </div>
        <div className="divide-y divide-gray-800/50 px-4 py-3">
          <Row label="Name" value={user?.name || "—"} />
          <Row label="Email" value={user?.email || "—"} />
          <Row label="Role" value={user?.role || "—"} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  )
}
