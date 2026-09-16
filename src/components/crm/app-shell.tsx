"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - desktop */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        className="hidden lg:flex"
      />

      {/* Sidebar - mobile overlay */}
      <Sidebar
        collapsed={false}
        onToggle={toggleMobileMenu}
        className={cn(
          "lg:hidden",
          mobileMenuOpen ? "flex" : "hidden"
        )}
      />

      {/* Main content */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[260px]"
        )}
      >
        <Topbar onMenuToggle={toggleMobileMenu} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
