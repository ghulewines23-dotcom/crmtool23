"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  // Validate token on mount
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
    } else {
      // Token exists in URL — we'll validate it on submit
      setTokenValid(true)
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to reset password")
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
    }
    setLoading(false)
  }

  // No token in URL
  if (tokenValid === false) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or missing a token.
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <p>Please request a new password reset link.</p>
          </div>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Request new reset link
        </Link>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
      </div>
    )
  }

  // Loading token validation
  if (tokenValid === null) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Set new password</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-[#1a1a1a]">Set new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password for your account
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-6 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="font-medium">Password updated</p>
            <p className="text-sm text-muted-foreground">
              Your password has been reset successfully. All previous sessions have been logged out.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Sign in with new password
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
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

          <Button
            type="submit"
            className="w-full"
            disabled={loading || password.length < 8 || password !== confirmPassword}
          >
            {loading ? "Resetting..." : "Reset password"}
          </Button>

          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to login
          </Link>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Set new password</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
