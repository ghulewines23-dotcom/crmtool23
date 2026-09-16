"use client";

import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-white font-bold text-sm">
            S
          </div>
          <span className="text-lg font-bold tracking-tight">Serene CRM</span>
        </Link>

        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  );
}
