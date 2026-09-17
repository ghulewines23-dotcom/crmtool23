"use client";

import { AuthProvider } from "@/lib/auth-context";
import { CRMDataProvider } from "@/lib/crm-data-context";
import { PushProvider } from "@/lib/push-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PushProvider>
        <CRMDataProvider>{children}</CRMDataProvider>
      </PushProvider>
    </AuthProvider>
  );
}
