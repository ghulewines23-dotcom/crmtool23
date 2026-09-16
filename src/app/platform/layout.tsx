"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "SERENE_OWNER") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">
          Serene Owner privileges are required to access this portal. Customer accounts are strictly unauthorized.
        </p>
        <Link href="/dashboard" className="mt-6">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-border bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Serene CRM
          </span>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Serene Owner
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{user.email}</span>
          <Link href="/dashboard" className="text-xs text-primary hover:underline">
            Switch to CRM Dashboard
          </Link>
        </div>
      </header>
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
