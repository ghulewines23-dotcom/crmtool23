"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { PLAN_LIMITS } from "@/lib/plan-config"
import type { SubscriptionPlan } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

const RAZORPAY_PAYMENT_LINK = "https://razorpay.me/@ayushjha4609"

const planNames: Record<string, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  PRO: "Pro",
}

const planPrices: Record<string, string> = {
  STARTER: "₹1,000",
  GROWTH: "₹3,000",
  PRO: "₹5,000",
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <PaymentPendingContent />
    </Suspense>
  )
}

function PaymentPendingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading } = useAuth()

  const paymentId = searchParams.get("paymentId")
  const plan = searchParams.get("plan") || "STARTER"
  const planConfig = PLAN_LIMITS[plan as SubscriptionPlan]

  const [payment, setPayment] = useState<{
    status: string
    amount: number
    plan: string
  } | null>(null)
  const [fetching, setFetching] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!paymentId) {
      setFetching(false)
      return
    }
    fetch(`/api/payments`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.payments) {
          const found = data.payments.find((p: { _id: string }) => p._id === paymentId)
          if (found) {
            setPayment({
              status: found.status,
              amount: found.amount,
              plan: found.plan,
            })
          }
        }
        setFetching(false)
      })
      .catch(() => setFetching(false))
  }, [paymentId])

  useEffect(() => {
    if (payment?.status === "APPROVED") {
      router.push("/dashboard")
    }
  }, [payment?.status, router])

  if (isLoading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    router.replace("/login")
    return null
  }

  const amount = planConfig?.price || 0

  function copyPaymentId() {
    if (paymentId) {
      navigator.clipboard.writeText(paymentId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-white font-bold text-sm">
            L
          </div>
          <span className="text-lg font-bold tracking-tight">Serene CRM</span>
        </Link>

        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5 text-center">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                <Clock className="h-7 w-7 text-amber-600" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-[#1a1a1a]">Payment Pending</h1>
            <p className="text-sm text-muted-foreground">
              Complete your payment to activate the {planNames[plan] || plan} plan
            </p>
          </div>

          <div className="rounded-lg border border-border bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-semibold">{planNames[plan] || plan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-sm font-semibold">₹{amount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className="text-sm font-semibold">{planConfig?.durationDays || 30} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Members</span>
              <span className="text-sm font-semibold">Up to {planConfig?.maxMembers || 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Leads</span>
              <span className="text-sm font-semibold">{planConfig?.maxLeads || 20}</span>
            </div>
            {paymentId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment ID</span>
                <button
                  onClick={copyPaymentId}
                  className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground"
                >
                  {paymentId.slice(0, 16)}...
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            )}
          </div>

          {payment?.status === "PENDING" && (
            <div className="space-y-3">
              <a
                href={RAZORPAY_PAYMENT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full h-10 rounded-md" size="lg">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{amount.toLocaleString("en-IN")} via Razorpay
                  <ExternalLink className="h-3.5 w-3.5 ml-2" />
                </Button>
              </a>
              <p className="text-center text-xs text-muted-foreground">
                You will be redirected to Razorpay to complete the payment securely.
              </p>
            </div>
          )}

          {payment?.status === "APPROVED" && (
            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <p className="text-sm text-emerald-600 font-medium">Payment approved! Redirecting to dashboard...</p>
            </div>
          )}

          {payment?.status === "REJECTED" && (
            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <p className="text-sm text-red-600 font-medium">Payment was not approved.</p>
              <p className="text-xs text-muted-foreground">
                Please contact support for assistance.
              </p>
            </div>
          )}

          {!fetching && !payment && paymentId && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 text-center">
              Payment record not found. Please contact support.
            </div>
          )}

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-xs text-blue-700">
            <p className="font-medium mb-2">How to complete payment:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Click the &quot;Pay Now&quot; button above</li>
              <li>Enter amount: <strong>₹{amount.toLocaleString("en-IN")}</strong></li>
              <li>Complete payment on Razorpay</li>
              <li>After payment, your plan will be activated within 24 hours</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full h-10 rounded-md">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
