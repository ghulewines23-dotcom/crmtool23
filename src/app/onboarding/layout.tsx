"use client";

import Link from "next/link";
import { cn } from "cn";

const steps = [
  { label: "Business", number: 1 },
  { label: "Customize", number: 2 },
  { label: "Team", number: 3 },
  { label: "Import", number: 4 },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-white font-bold text-sm">
            L
          </div>
          <span className="text-lg font-bold tracking-tight">Serene CRM</span>
        </Link>

        <div className="mb-8 w-full max-w-lg">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.number} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                      i < 3
                        ? "bg-foreground text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step.number}
                  </div>
                  <span className="text-[12px] font-medium text-muted-foreground hidden sm:inline">
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="mx-3 h-px w-8 sm:w-12 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  );
}
