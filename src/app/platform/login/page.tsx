"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PlatformLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/platform/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Login failed")
      }

      window.location.href = "/platform"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shield className="h-6 w-6 text-emerald-500" />
          </div>
          <h1 className="text-xl font-semibold text-white">Owner Panel</h1>
          <p className="text-sm text-gray-500">Sign in to manage your platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-800 bg-[#111] p-6">
          {error && (
            <div className="rounded-lg border border-red-800/30 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
              {error}
            </div>
          )}

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
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 bg-[#0a0a0a] border-gray-800 text-white placeholder:text-gray-700"
                required
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

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-600">
          <Link href="/login" className="text-gray-500 hover:text-gray-300">
            ← Back to main login
          </Link>
        </p>
      </div>
    </div>
  )
}
