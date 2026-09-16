"use client"

import { useState } from "react"
import Link from "next/link"
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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

    setSubmitting(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Signup failed")
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Account created</h1>
          <p className="text-sm text-muted-foreground">
            Your access is pending administrator approval.
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-blue-900">Account pending approval</p>
              <p className="text-[12px] text-blue-700 mt-0.5">
                Please contact your organization administrator to activate your account.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-[#1a1a1a]">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Sign up to get started with Serene CRM
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

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
          disabled={submitting || password.length < 8 || password !== confirmPassword}
        >
          {submitting ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
