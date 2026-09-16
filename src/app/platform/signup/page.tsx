"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, User, Eye, EyeOff, Shield, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PlatformSignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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
      const res = await fetch("/api/platform/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Signup failed")
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-4 rounded-xl border border-gray-800 bg-[#111] p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            </div>
            <h1 className="text-xl font-semibold text-white">Account Created</h1>
            <p className="text-sm text-gray-500">Owner account created successfully.</p>
            <Link href="/platform/login">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shield className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-xl font-semibold text-white">Create Owner Account</h1>
          <p className="text-sm text-gray-500">Set up your platform owner account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-800 bg-[#111] p-6">
          {error && (
            <div className="rounded-lg border border-red-800/30 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Full Name</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-600" />
              <Input
                placeholder="Owner name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 bg-[#0a0a0a] border-gray-800 text-white placeholder:text-gray-700"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-600" />
              <Input
                type="email"
                placeholder="owner@serene.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-[#0a0a0a] border-gray-800 text-white placeholder:text-gray-700"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-600" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 bg-[#0a0a0a] border-gray-800 text-white placeholder:text-gray-700"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-400 text-xs">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-600" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 bg-[#0a0a0a] border-gray-800 text-white placeholder:text-gray-700"
                required
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0" disabled={loading || password.length < 8 || password !== confirmPassword}>
            {loading ? "Creating..." : "Create Owner Account"}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-600">
          <Link href="/platform/login" className="text-gray-500 hover:text-gray-300">
            ← Already have an account? Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
