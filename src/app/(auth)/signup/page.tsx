"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  User,
  Mail,
  Lock,
  Building2,
  Phone,
  Check,
  ChevronRight,
  ChevronLeft,
  Zap,
  Rocket,
  Crown,
  Star,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { PLAN_LIMITS } from "@/lib/plan-config"
import type { SubscriptionPlan } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "cn"

const plans = [
  {
    id: "FREE_TRIAL" as SubscriptionPlan,
    name: "Free Trial",
    price: "₹0",
    priceValue: 0,
    period: "7 days",
    description: "Try Serene CRM free for 7 days",
    icon: Zap,
  },
  {
    id: "STARTER" as SubscriptionPlan,
    name: "Starter",
    price: "₹1,000",
    priceValue: 1000,
    period: "/month",
    description: "For small teams getting started",
    icon: Rocket,
  },
  {
    id: "GROWTH" as SubscriptionPlan,
    name: "Growth",
    price: "₹3,000",
    priceValue: 3000,
    period: "/month",
    description: "For growing businesses",
    icon: Crown,
  },
  {
    id: "PRO" as SubscriptionPlan,
    name: "Pro",
    price: "₹5,000",
    priceValue: 5000,
    period: "/month",
    description: "For large teams and enterprises",
    icon: Star,
  },
] as const

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
]

const RAZORPAY_PAYMENT_LINK = "https://razorpay.me/@ayushjha4609"

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signup, isLoading } = useAuth()

  const [step, setStep] = useState(1)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("FREE_TRIAL")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [businessName, setBusinessName] = useState("")
  const [industry, setIndustry] = useState("")
  const [phone, setPhone] = useState("")

  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const plan = searchParams.get("plan")
    if (plan) {
      const normalized = plan.toUpperCase() as SubscriptionPlan
      if (plans.some((p) => p.id === normalized)) {
        setSelectedPlan(normalized)
        setStep(2)
      }
    }
  }, [searchParams])

  const currentPlan = plans.find((p) => p.id === selectedPlan)!
  const isPaidPlan = selectedPlan !== "FREE_TRIAL"
  const planConfig = PLAN_LIMITS[selectedPlan]

  function canProceedStep1() {
    return plans.some((p) => p.id === selectedPlan)
  }

  function canProceedStep2() {
    return (
      name.trim() &&
      email.trim() &&
      password.length >= 6 &&
      password === confirmPassword
    )
  }

  function canProceedStep3() {
    return businessName.trim() && industry && phone.trim()
  }

  async function handleSubmit() {
    setError("")
    setSubmitting(true)
    try {
      await signup({
        name,
        email,
        password,
        businessName,
        phone,
        industry,
      })

      if (isPaidPlan) {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: selectedPlan,
            notes: `Payment request for ${currentPlan.name} plan`,
          }),
        })
        const data = await res.json()
        if (data.success && data.payment) {
          router.push(
            `/payment-pending?paymentId=${data.payment._id}&plan=${selectedPlan}`
          )
          return
        }
        setError("Failed to create payment request. Please try again.")
        setSubmitting(false)
        return
      }

      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
      setSubmitting(false)
    }
  }

  const totalSteps = isPaidPlan ? 4 : 3

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-[#1a1a1a]">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Step {step} of {totalSteps} —{" "}
          {step === 1
            ? "Choose a plan"
            : step === 2
              ? "Personal details"
              : step === 3
                ? "Business details"
                : "Review & confirm"}
        </p>
      </div>

      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              s <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="min-h-[340px]">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {plans.map((plan) => {
              const Icon = plan.icon
              const isSelected = selectedPlan === plan.id
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-medium">{plan.name}</span>
                      <span className="text-sm font-semibold">{plan.price}</span>
                      <span className="text-xs text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                  </div>
                  {isSelected && <Check className="size-4 text-primary shrink-0" />}
                </button>
              )
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Selected Plan
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-medium">{currentPlan.name}</span>
                <span className="text-sm font-semibold">{currentPlan.price}</span>
                <span className="text-xs text-muted-foreground">{currentPlan.period}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your plan includes up to {planConfig.maxMembers} member{planConfig.maxMembers !== 1 ? "s" : ""} and {planConfig.maxLeads} leads.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business Name</Label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="businessName"
                  placeholder="Acme Inc."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <select
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                required
              >
                <option value="">Select your industry</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-white p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Account
              </p>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{email}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-white p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Business
              </p>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Business Name</span>
                <span className="font-medium">{businessName}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Industry</span>
                <span className="font-medium">{industry}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{phone}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-white p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Plan
              </p>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{currentPlan.name}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">{currentPlan.price}{currentPlan.period}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Members</span>
                <span className="font-medium">Up to {planConfig.maxMembers}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Leads</span>
                <span className="font-medium">{planConfig.maxLeads}</span>
              </div>
              {isPaidPlan && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{planConfig.durationDays} days</span>
                </div>
              )}
            </div>

            {isPaidPlan && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                After creating your account, you will be redirected to complete payment via Razorpay. Your account will be activated after payment verification by the Serene Owner.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1"
            disabled={submitting}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        )}

        {step < totalSteps ? (
          <Button
            type="button"
            onClick={() => setStep(step + 1)}
            className="flex-1"
            disabled={
              step === 1
                ? !canProceedStep1()
                : step === 2
                  ? !canProceedStep2()
                  : !canProceedStep3()
            }
          >
            Continue
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1"
            disabled={isLoading || submitting}
          >
            {submitting
              ? "Creating account..."
              : isPaidPlan
                ? "Create Account & Pay"
                : "Start Free Trial"}
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
