"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard,
  Users,
  Shield,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  Phone,
  FileText,
  ClipboardList,
  Briefcase,
  CreditCard,
  Upload,
} from "lucide-react"

const CRM_NAV = [
  { href: "/platform/overview", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform/leads", label: "Leads", icon: Phone },
  { href: "/platform/clients", label: "Clients", icon: Users },
  { href: "/platform/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/platform/projects", label: "Projects", icon: Briefcase },
  { href: "/platform/invoices", label: "Invoices", icon: FileText },
  { href: "/platform/team", label: "Team", icon: Users },
  { href: "/platform/import", label: "Import", icon: Upload },
  { href: "/platform/payments", label: "Payments", icon: CreditCard },
]

const ADMIN_NAV = [
  { href: "/platform/users", label: "Manage Users", icon: Shield },
  { href: "/platform/access", label: "Access Control", icon: Shield },
  { href: "/platform/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/platform/settings", label: "Settings", icon: Settings },
]

const PUBLIC_ROUTES = ["/platform/login", "/platform/signup"]

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isPublic = PUBLIC_ROUTES.includes(pathname)

  useEffect(() => {
    if (isPublic) return
    if (!isLoading && !isAuthenticated) {
      router.replace("/platform/login")
    }
    if (!isLoading && isAuthenticated && user && user.role !== "SERENE_OWNER") {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, isLoading, user, router, isPublic])

  if (isPublic) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-emerald-500" />
      </div>
    )
  }

  if (!isAuthenticated || !user || user.role !== "SERENE_OWNER") {
    return null
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-[#111] border-r border-gray-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto overflow-y-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex h-12 items-center justify-between border-b border-gray-800 px-4">
            <span className="text-sm font-semibold text-white">Serene Agency</span>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500">
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 py-3">
            <div className="px-3 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">CRM</span>
            </div>
            {CRM_NAV.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 mx-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"}`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}

            <div className="px-3 mt-4 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">Admin</span>
            </div>
            {ADMIN_NAV.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 mx-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${isActive ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"}`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-gray-800 p-2">
            <Link
              href="/dashboard"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            >
              <LayoutDashboard className="h-4 w-4" />
              User Dashboard
            </Link>
            <button
              onClick={() => { logout(); router.replace("/platform/login") }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center justify-between border-b border-gray-800 bg-[#111] px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400">
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-medium text-gray-300">Owner Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:inline">{user?.email}</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-medium text-emerald-400">
              {user?.name?.charAt(0)?.toUpperCase() || "O"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</main>
      </div>
    </div>
  )
}
