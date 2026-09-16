"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Briefcase,
  Users,
  Target,
  Upload,
  Plus,
  ArrowRight,
  ChevronRight,
  PartyPopper,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

const totalSteps = 4;

const industries = [
  "Technology",
  "Marketing & Advertising",
  "Financial Services",
  "Real Estate",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail",
  "Consulting",
  "Other",
];

const leadSources = [
  "Website",
  "Google Ads",
  "Facebook Ads",
  "Referrals",
  "Cold Calling",
  "Events & Conferences",
  "LinkedIn",
  "WhatsApp",
];

const roles = [
  { value: "FOUNDER", label: "Founder" },
  { value: "ADMIN", label: "Admin" },
  { value: "SALES_PERSON", label: "Sales Person" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("India");

  const [whatDoYouSell, setWhatDoYouSell] = useState("");
  const [primaryLeadSource, setPrimaryLeadSource] = useState("");
  const [salespeople, setSalespeople] = useState("1-5");

  const [teamName, setTeamName] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState("ADMIN");

  function canProceed() {
    if (step === 1) return businessName.trim() && industry && phone.trim();
    if (step === 2) return whatDoYouSell.trim() && primaryLeadSource;
    if (step === 3) return teamName.trim() && teamEmail.trim() && teamRole;
    return true;
  }

  function handleNext() {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setStep(5);
    }
  }

  if (step === 5) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <PartyPopper className="h-8 w-8 text-foreground" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-[28px] font-semibold tracking-tight">Your CRM is ready!</h1>
          <p className="text-[13px] text-muted-foreground">
            Everything is set up. Start managing your leads, deals and team today.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 text-left space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Quick Summary
          </p>
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">Business</span>
            <span className="font-medium">{businessName || "TechCorp Solutions"}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">Industry</span>
            <span className="font-medium">{industry || "Technology"}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">Team</span>
            <span className="font-medium">{teamName || "Ayush Sharma"}</span>
          </div>
        </div>

        <Button className="w-full h-10 rounded-md" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-display text-[28px] font-semibold tracking-tight">
          {step === 1 && "Business Information"}
          {step === 2 && "Customize Your CRM"}
          {step === 3 && "Invite Your Team"}
          {step === 4 && "Import Leads"}
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Step {step} of {totalSteps}
        </p>
      </div>

      <div className="min-h-[320px]">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Business Name</Label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Acme Inc."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-10 text-[13px] pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Industry</Label>
              <div className="relative">
                <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="flex h-10 w-full min-w-0 rounded-lg border border-border bg-white pl-9 pr-2.5 py-1 text-[13px] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Select your industry</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Website</Label>
              <div className="relative">
                <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="www.example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="h-10 text-[13px] pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 text-[13px] pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Country</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-10 text-[13px] pl-9"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">What do you sell?</Label>
              <div className="relative">
                <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. SaaS subscriptions, consulting services"
                  value={whatDoYouSell}
                  onChange={(e) => setWhatDoYouSell(e.target.value)}
                  className="h-10 text-[13px] pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Primary Lead Source</Label>
              <div className="relative">
                <Target className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={primaryLeadSource}
                  onChange={(e) => setPrimaryLeadSource(e.target.value)}
                  className="flex h-10 w-full min-w-0 rounded-lg border border-border bg-white pl-9 pr-2.5 py-1 text-[13px] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Select primary source</option>
                  {leadSources.map((src) => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">How many salespeople?</Label>
              <div className="relative">
                <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={salespeople}
                  onChange={(e) => setSalespeople(e.target.value)}
                  className="flex h-10 w-full min-w-0 rounded-lg border border-border bg-white pl-9 pr-2.5 py-1 text-[13px] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="1-5">1 – 5 people</option>
                  <option value="6-20">6 – 20 people</option>
                  <option value="21-50">21 – 50 people</option>
                  <option value="51+">51+ people</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-white p-5 space-y-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Team Member
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="h-10 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Email</Label>
                  <Input
                    placeholder="john@company.com"
                    type="email"
                    value={teamEmail}
                    onChange={(e) => setTeamEmail(e.target.value)}
                    className="h-10 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Role</Label>
                  <select
                    value={teamRole}
                    onChange={(e) => setTeamRole(e.target.value)}
                    className="flex h-10 w-full min-w-0 rounded-lg border border-border bg-white px-2.5 py-1 text-[13px] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full h-9 rounded-md" size="sm">
              <Plus className="h-4 w-4" />
              Add Another Member
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-border p-8 text-center space-y-3">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-[13px] font-medium">Import from CSV</p>
                <p className="text-[12px] text-muted-foreground">
                  Upload a CSV file with your leads, contacts or customers
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-9 rounded-md">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-[#fafafa] px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button className="w-full h-10 rounded-md">
              <Plus className="h-4 w-4" />
              Add First Lead Manually
            </Button>

            <Button
              variant="ghost"
              className="w-full h-9 rounded-md text-muted-foreground"
              onClick={handleNext}
            >
              Skip for now
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {step < 4 && (
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" className="flex-1 h-9 rounded-md" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button className="flex-1 h-10 rounded-md" onClick={handleNext} disabled={!canProceed()}>
            {step === totalSteps ? "Finish Setup" : "Continue"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
