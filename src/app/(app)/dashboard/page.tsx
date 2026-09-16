"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import AdminDashboard from "@/components/crm/admin-dashboard";

export default function DashboardPage() {
  const { hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hasRole("SALES_PERSON")) {
      router.replace("/leads");
    }
  }, [hasRole, router]);

  if (hasRole("SALES_PERSON")) {
    return null;
  }

  if (hasRole("FOUNDER", "ADMIN", "SERENE_OWNER")) {
    return <AdminDashboard />;
  }

  return null;
}
