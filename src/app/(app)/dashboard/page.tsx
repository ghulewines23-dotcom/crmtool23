"use client";

import { useAuth } from "@/lib/auth-context";
import AdminDashboard from "@/components/crm/admin-dashboard";
import SalesDashboard from "@/components/crm/sales-dashboard";

export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  if (hasRole("SALES_PERSON")) {
    return <SalesDashboard />;
  }

  if (hasRole("FOUNDER", "ADMIN", "SERENE_OWNER")) {
    return <AdminDashboard />;
  }

  return null;
}
