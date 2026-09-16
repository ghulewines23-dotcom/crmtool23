"use client"

import Link from "next/link"
import { LayoutDashboard } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-[#f4f4f5] p-12 flex-col justify-between">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-[#1a1a1a]">
          Serene CRM
        </Link>
        <div className="space-y-4">
          <h1 className="font-display text-4xl font-semibold leading-tight text-[#1a1a1a]">
            Grow your pipeline.<br />Close more deals.
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            The CRM built for modern sales teams. Manage leads, track deals,
            and automate follow-ups — all in one place.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Serene CRM. All rights reserved.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight text-[#1a1a1a] lg:hidden mb-6 block">
            Serene CRM
          </Link>
          <div className="rounded-lg border border-border bg-white p-6 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
