"use client"

import { useAuth } from "@/lib/auth-context"

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-[#1a1a1a]">Settings</h2>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-medium text-[#1a1a1a]">Owner Account</h3>
        </div>
        <div className="divide-y divide-gray-100 px-6 py-4">
          <Row label="Name" value={user?.name || "—"} />
          <Row label="Email" value={user?.email || "—"} />
          <Row label="Role" value={user?.role || "—"} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-medium text-[#1a1a1a]">Security</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500">
            Password changes are managed through the authentication system.
            Contact the system administrator to update your password.
          </p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-[#1a1a1a]">{value}</span>
    </div>
  )
}
