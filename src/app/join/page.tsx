"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function JoinPageInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [orgName, setOrgName] = useState("")
  const [role, setRole] = useState("")
  const [email, setEmail] = useState("")
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const validateToken = useCallback(async () => {
    if (!token) {
      setError("No join token provided")
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/auth/join?token=${encodeURIComponent(token)}`)
      const data = await res.json()
      if (!data.success) {
        setError(data.error || "Invalid join link")
      } else {
        setOrgName(data.organizationName)
        setRole(data.role === "ADMIN" ? "Admin" : "Sales Person")
        setEmail(data.email)
        setAlreadyRegistered(data.alreadyRegistered)
      }
    } catch {
      setError("Failed to validate join link")
    }
    setLoading(false)
  }, [token])

  useEffect(() => {
    validateToken()
  }, [validateToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) { setError("Name is required"); return }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return }

    setSubmitting(true)
    try {
      const res = await fetch("/api/auth/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), password }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || "Failed to create account")
      } else {
        setSuccess(true)
      }
    } catch {
      setError("Failed to create account")
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-6">
        <div className="w-full max-w-md space-y-6">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight text-[#1a1a1a] block">
            Serene CRM
          </Link>
          <div className="rounded-lg border border-border bg-white p-6 sm:p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="text-xl font-semibold text-[#1a1a1a]">Account Created!</h1>
            <p className="text-sm text-muted-foreground">
              Your account has been created and is <strong>pending approval</strong> from the organization owner.
              You&apos;ll be able to log in once approved.
            </p>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-[#f4f4f5] p-12 flex-col justify-between">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-[#1a1a1a]">
          Serene CRM
        </Link>
        <div className="space-y-4">
          <h1 className="font-display text-4xl font-semibold leading-tight text-[#1a1a1a]">
            You&apos;ve been invited!
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Join <strong>{orgName}</strong> as <strong>{role}</strong>.
            Create your account to get started.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Serene CRM. All rights reserved.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight text-[#1a1a1a] lg:hidden mb-6 block">
            Serene CRM
          </Link>
          <div className="rounded-lg border border-border bg-white p-6 sm:p-8">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {alreadyRegistered ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h1 className="text-xl font-semibold text-[#1a1a1a]">Already Registered</h1>
                  <p className="text-sm text-muted-foreground">
                    An account with <strong>{email}</strong> already exists.
                  </p>
                </div>
                <Link href="/login">
                  <Button className="w-full">Go to Login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <h1 className="text-xl font-semibold text-[#1a1a1a]">Create your account</h1>
                  <p className="text-sm text-muted-foreground">
                    Joining <strong>{orgName}</strong> as <strong>{role}</strong>
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground">
                  <Mail className="mb-1 inline h-4 w-4" /> {email}
                </div>

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
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9"
                      required
                      minLength={6}
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

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  )
}
