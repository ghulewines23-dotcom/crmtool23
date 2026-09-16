"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { useAuth } from "@/lib/auth-context";
import { Menu, Search, Bell, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

export function Topbar({ onMenuToggle, className }: TopbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  const notificationCount = 3;

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

      {/* Search */}
      <div className="relative w-full max-w-[480px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search leads, contacts or deals..."
          className="h-10 w-full rounded-lg border border-[#E7E7E5] bg-white pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[#F4F4F5] hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {notificationCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                {notificationCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 overflow-hidden rounded-lg border border-[#E7E7E5] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-[#E7E7E5] px-4 py-3">
                <p className="text-[13px] font-medium">Notifications</p>
                <span className="text-[11px] text-primary cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="divide-y divide-[#E7E7E5]">
                {[
                  { text: "New lead assigned: Sneha Patel", time: "2m ago" },
                  { text: "Deal won: Ahmedabad Jewellers", time: "1h ago" },
                  { text: "Follow-up overdue: Arjun Nair", time: "3h ago" },
                ].map((n, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-[#F8F8F6] transition-colors cursor-pointer">
                    <p className="text-[12px] text-foreground">{n.text}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 transition-colors hover:bg-[#F4F4F5]"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-[#F4F4F5] text-[11px] font-medium text-foreground">
                {getInitials(user?.name || "U")}
              </AvatarFallback>
            </Avatar>
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
