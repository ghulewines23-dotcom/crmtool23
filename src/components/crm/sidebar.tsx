"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileSpreadsheet,
  ClipboardList,
  Shield,
  User,
  BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UserRole } from "@/lib/types";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const ALL_ROLES: UserRole[] = ["FOUNDER", "ADMIN", "SALES_PERSON", "SERENE_OWNER"];
const ADMIN_ROLES: UserRole[] = ["FOUNDER", "ADMIN", "SERENE_OWNER"];

const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
      { label: "Leads", href: "/leads", icon: Users, roles: ALL_ROLES },
      { label: "Tasks", href: "/tasks", icon: ClipboardList, roles: ALL_ROLES },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Overview", href: "/overview", icon: BarChart3, roles: ADMIN_ROLES },
      { label: "Team", href: "/team", icon: Users, roles: ADMIN_ROLES },
      { label: "Clients", href: "/clients", icon: UserCheck, roles: ADMIN_ROLES },
      { label: "Import Leads", href: "/import-export", icon: FileSpreadsheet, roles: ADMIN_ROLES },
    ],
  },
  {
    title: "Owner",
    items: [
      { label: "Owner Panel", href: "/platform", icon: Shield, roles: ["SERENE_OWNER"] },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "FOUNDER": return "Founder";
    case "ADMIN": return "Admin";
    case "SALES_PERSON": return "Sales Person";
    case "SERENE_OWNER": return "Serene Owner";
    default: return role;
  }
}

export function Sidebar({ collapsed, onToggle, className }: SidebarProps) {
  const pathname = usePathname();
  const { user, organization, subscription, hasRole, logout } = useAuth();

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasRole(...item.roles)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[232px]",
        className
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-14 items-center border-b border-slate-200/80 px-4", collapsed && "justify-center")}>
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-violet-600 text-white shadow-sm shadow-blue-500/30">
              <span className="font-display text-sm font-bold">S</span>
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight text-slate-900">
              Serene CRM
            </span>
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-violet-600 text-white shadow-sm shadow-blue-500/30">
            <span className="font-display text-sm font-bold">S</span>
          </div>
        )}
      </div>

      {/* Organization */}
      {!collapsed && (
        <div className="border-b border-slate-200/80 px-4 py-2.5">
          <p className="truncate text-[12px] font-medium text-slate-500">
            {organization?.name || "Your Organization"}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-5">
          {visibleSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150",
                          isActive
                            ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-100"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                          collapsed && "justify-center px-2"
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            isActive ? "text-blue-600" : "text-slate-400"
                          )}
                        />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-slate-200/80 px-2.5 py-2 hidden lg:block">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg px-2 py-1.5 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* User Profile */}
      <div className="border-t border-slate-200/80 px-2.5 py-2.5">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-2 transition-all hover:bg-slate-50",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <User className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[13px] font-medium text-slate-900">
                  {user?.name || "User"}
                </span>
                <span className="text-[11px] text-slate-400">
                  {getRoleLabel(user?.role || "SALES_PERSON")}
                </span>
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="shrink-0 rounded-md p-1 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
