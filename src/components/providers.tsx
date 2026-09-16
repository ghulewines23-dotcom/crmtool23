"use client";

import { AuthProvider } from "@/lib/auth-context";
import { CRMDataProvider } from "@/lib/crm-data-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CRMDataProvider>{children}</CRMDataProvider>
    </AuthProvider>
  );
}
