"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { useAuth } from "@/lib/auth-context";
import { Menu, Search, Bell, User, Settings, LogOut, ChevronDown, Check, X, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OrganizationSelector } from "./organization-selector";

interface TopbarProps {
  onMenuToggle: () => void;
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

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function Topbar({ onMenuToggle, className }: TopbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const {
    user,
    logout,
    notifications,
    unreadNotificationCount,
    markNotificationsRead,
    isPlatformOwner,
  } = useAuth();

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAcceptInvitation(invitationId: string) {
    setAcceptingId(invitationId);
    try {
      const res = await fetch("/api/auth/join/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token: invitationId }),
      });
      const data = await res.json();
      if (data.success) {
        await markNotificationsRead([invitationId]);
        window.location.reload();
      }
    } catch {
      // Silent fail
    }
    setAcceptingId(null);
  }

  async function handleDeclineInvitation(notificationId: string) {
    setDecliningId(notificationId);
    await markNotificationsRead([notificationId]);
    setDecliningId(null);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6",
        className
      )}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        mr-3 rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 lg:hidden
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Organization Selector */}
      <OrganizationSelector />

      {/* Search */}
      <div className="relative w-full max-w-[400px] ml-4 hidden sm:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search leads, contacts..."
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-4 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Notification bell */}
        {!isPlatformOwner && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                if (!notifOpen && unreadNotificationCount > 0) {
                  markNotificationsRead();
                }
              }}
              className="relative rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-[13px] font-semibold text-slate-900">Notifications</p>
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={() => markNotificationsRead()}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-400">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "px-4 py-3 transition-colors",
                          !n.read && "bg-blue-50/50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                            n.type === "member_joined" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {n.type === "member_joined" ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : n.invitationId ? (
                              <Clock className="h-3.5 w-3.5" />
                            ) : (
                              <Bell className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-slate-900">{n.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
                            {n.invitationId && !n.read && (
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleAcceptInvitation(n.invitationId!)}
                                  disabled={acceptingId === n.invitationId}
                                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {acceptingId === n.invitationId ? (
                                    <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDeclineInvitation(n.id)}
                                  disabled={decliningId === n.id}
                                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <X className="h-3 w-3" />
                                  Decline
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 transition-all hover:bg-slate-100"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden text-[13px] font-medium text-slate-700 sm:block">
              {user?.name?.split(" ")[0] || "User"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
              <div className="p-1">
                <button
                  onClick={() => { setDropdownOpen(false); router.push("/settings"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Profile
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); router.push("/settings"); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Account Settings
                </button>
              </div>
              <div className="border-t border-slate-100 p-1">
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
