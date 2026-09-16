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
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ADMIN_ROLES },
      { label: "Leads", href: "/leads", icon: Users, roles: ALL_ROLES },
      { label: "Tasks", href: "/tasks", icon: ClipboardList, roles: ADMIN_ROLES },
    ],
  },
  {
    title: "Business",
    items: [
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
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-white transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[240px]",
        className
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center")}>
        {!collapsed ? (
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Serene CRM
          </span>
        ) : (
          <span className="font-display text-lg font-semibold text-foreground">S</span>
        )}
      </div>

      {/* Organization */}
      {!collapsed && (
        <div className="border-b border-border px-4 py-3">
          <p className="truncate text-sm font-medium text-foreground">
            {organization?.name || "Your Organization"}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {visibleSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                          isActive
                            ? "bg-primary/5 text-primary"
                            : "text-muted-foreground hover:bg-[#F4F4F5] hover:text-foreground",
                          collapsed && "justify-center px-2"
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground"
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
      <div className="border-t border-border px-3 py-2 hidden lg:block">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* User Profile */}
      <div className="border-t border-border px-3 py-3">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-muted",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
              {getInitials(user?.name || "U")}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm font-medium text-foreground">
                  {user?.name || "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getRoleLabel(user?.role || "SALES_PERSON")}
                </span>
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
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
