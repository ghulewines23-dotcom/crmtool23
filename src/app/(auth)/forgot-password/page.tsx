"use client"

import Link from "next/link"
import { ArrowLeft, Info } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-[#1a1a1a]">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Password reset is currently unavailable
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <Info className="size-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-blue-900">Contact your organization owner</p>
            <p className="text-[12px] text-blue-700 mt-0.5">
              Please ask your organization owner or administrator to reset your password.
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/login"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
        Back to login
      </Link>
    </div>
  )
}
