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
        "sticky top-0 z-30 flex h-16 items-center border-b border-[#EAEAEA] bg-white px-6",
        className
      )}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="mr-3 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[#F4F4F5] hover:text-foreground lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Organization Selector */}
      <OrganizationSelector />

      {/* Search */}
      <div className="relative w-full max-w-[480px] ml-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search leads, contacts or deals..."
          className="h-10 w-full rounded-lg border border-[#E7E7E5] bg-white pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
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
                  // Mark all as read when opening
                  markNotificationsRead();
                }
              }}
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[#F4F4F5] hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 overflow-hidden rounded-lg border border-[#E7E7E5] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between border-b border-[#E7E7E5] px-4 py-3">
                  <p className="text-[13px] font-medium">Notifications</p>
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={() => markNotificationsRead()}
                      className="text-[11px] text-primary cursor-pointer hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="divide-y divide-[#E7E7E5] max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-[13px] text-muted-foreground">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "px-4 py-3 transition-colors",
                          !n.read && "bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                            n.type === "member_joined" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
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
                            <p className="text-[12px] font-medium text-foreground">{n.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTimeAgo(n.createdAt)}</p>
                            {/* Invitation actions */}
                            {n.invitationId && !n.read && (
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleAcceptInvitation(n.invitationId!)}
                                  disabled={acceptingId === n.invitationId}
                                  className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-white hover:bg-primary/90 disabled:opacity-50"
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
                                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
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
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 transition-colors hover:bg-[#F4F4F5]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden text-[13px] font-medium text-foreground sm:block">
              {user?.name?.split(" ")[0] || "User"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-lg border border-[#E7E7E5] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <div className="p-1">
                <button
                  onClick={() => { setDropdownOpen(false); router.push("/settings"); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-[#F4F4F5]"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); router.push("/settings"); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-[#F4F4F5]"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Account Settings
                </button>
              </div>
              <div className="border-t border-[#E7E7E5] p-1">
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-[#F4F4F5]"
                >
                  <LogOut className="h-4 w-4 text-muted-foreground" />
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
