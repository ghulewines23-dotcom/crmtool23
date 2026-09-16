"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, Shield } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  // OTP verification state (shown after password verification on new device)
  const [otpRequired, setOtpRequired] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpMessage, setOtpMessage] = useState("")
  const [otpResendCooldown, setOtpResendCooldown] = useState(0)

  // Step 1: Password login
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setOtpMessage("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (data.requiresOtp) {
        // New device detected — show OTP form
        setOtpRequired(true)
        setMaskedEmail(data.maskedEmail)
        setOtpMessage(data.message)
        startResendCooldown()
        return
      }

      if (!data.success) {
        throw new Error(data.error || "Login failed")
      }

      // Role-based redirect
      const role = data.user?.role
      if (role === "SERENE_OWNER") {
        window.location.href = "/platform"
      } else {
        window.location.href = "/dashboard"
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    }
  }

  // Step 2: OTP verification
  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setOtpLoading(true)

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Invalid OTP")
      }

      // OTP verified — role-based redirect
      const role = data.user?.role
      if (role === "SERENE_OWNER") {
        window.location.href = "/platform"
      } else {
        window.location.href = "/dashboard"
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed")
    }
    setOtpLoading(false)
  }

  // Resend OTP
  async function handleResendOtp() {
    setError("")
    setOtpMessage("")
    setOtpLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (data.requiresOtp) {
        setOtpMessage("New verification code sent")
        startResendCooldown()
      } else {
        setError("Failed to resend OTP")
      }
    } catch {
      setError("Failed to resend OTP")
    }
    setOtpLoading(false)
  }

  function startResendCooldown() {
    setOtpResendCooldown(60)
    const interval = setInterval(() => {
      setOtpResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-[#1a1a1a]">
          {otpRequired ? "Verify your identity" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {otpRequired
            ? `We've sent a verification code to your registered email.`
            : "Sign in to your account to continue"}
        </p>
      </div>

      {!otpRequired ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}
          {otpMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-700">
              {otpMessage}
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <Shield className="size-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-[13px] font-medium text-blue-900">New device detected</p>
                <p className="text-[12px] text-blue-700 mt-0.5">
                  A verification code has been sent to <span className="font-medium">{maskedEmail}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="otp">Enter verification code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-lg tracking-[0.5em]"
              maxLength={6}
              required
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={otpLoading || otp.length !== 6}>
            {otpLoading ? "Verifying..." : "Verify OTP"}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              className="text-sm text-muted-foreground"
              onClick={handleResendOtp}
              disabled={otpResendCooldown > 0 || otpLoading}
            >
              {otpResendCooldown > 0
                ? `Resend OTP in ${otpResendCooldown}s`
                : "Resend OTP"}
            </Button>
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              className="text-sm text-muted-foreground"
              onClick={() => {
                setOtpRequired(false)
                setOtp("")
                setError("")
                setOtpMessage("")
              }}
            >
              Back to login
            </Button>
          </div>
        </form>
      )}

      {!otpRequired && (
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      )}
    </div>
  )
}
