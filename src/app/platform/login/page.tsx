"use client"

import { useState, useEffect, useRef } from "react"
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
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((c) => c - 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [cooldown])

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
        if (res.status === 429) {
          const match = data.error?.match(/(\d+)\s*second/)
          if (match) {
            setCooldown(parseInt(match[1]))
          }
        }
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
              {cooldown > 0 && (
                <span className="ml-2 font-mono font-bold text-red-300">
                  {cooldown}s
                </span>
              )}
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

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0" disabled={loading || cooldown > 0}>
            {cooldown > 0 ? `Wait ${cooldown}s` : loading ? "Signing in..." : "Sign In"}
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
