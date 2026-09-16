"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "cn";

export function OrganizationSelector() {
  const { organization, organizations, switchOrganization, isPlatformOwner } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Don't show for Serene Owner
  if (isPlatformOwner) return null;

  // Don't show if user only has one org
  if (organizations.length <= 1) return null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSwitch(orgId: string) {
    if (orgId === organization?.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchOrganization(orgId);
      // Full page reload to refresh all data
      window.location.reload();
    } catch {
      setSwitching(false);
      setOpen(false);
    }
  }

  const currentOrg = organizations.find((o) => o.isActive) || organizations[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
          "hover:bg-[#F4F4F5] text-foreground",
          switching && "opacity-50 cursor-not-allowed"
        )}
      >
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="hidden sm:block max-w-[160px] truncate">
          {organization?.name || currentOrg?.name || "Organization"}
        </span>
        {switching ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 overflow-hidden rounded-lg border border-[#E7E7E5] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-50">
          <div className="px-3 py-2 border-b border-[#E7E7E5]">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Organizations
            </p>
          </div>
          <div className="p-1 max-h-[300px] overflow-y-auto">
            {organizations.map((org) => (
              <button
                key={org.organizationId}
                onClick={() => handleSwitch(org.organizationId)}
                disabled={switching}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                  org.isActive
                    ? "bg-primary/5 text-primary font-medium"
                    : "text-foreground hover:bg-[#F4F4F5]"
                )}
              >
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{org.name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {org.role.replace("_", " ").toLowerCase()} · {org.subscription?.plan?.replace("_", " ") || "Free"}
                  </p>
                </div>
                {org.isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
