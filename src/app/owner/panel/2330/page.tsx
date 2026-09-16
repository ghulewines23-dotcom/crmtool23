"use client"

import { useState, useEffect } from "react"
import { Shield, User, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OwnerPanelLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" })
        const data = await res.json()
        if (!cancelled && data.success && data.user?.role === "SERENE_OWNER") {
          window.location.href = "/platform"
          return
        }
      } catch {}
      if (!cancelled) setChecking(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/owner-panel/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password }),
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

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-emerald-500" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="h-7 w-7 text-emerald-500" />
          </div>
          <h1 className="text-xl font-semibold text-white">Owner Panel</h1>
          <p className="text-sm text-gray-400">
            Serene CRM administration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-gray-300">Username</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
              <Input
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9 bg-[#111] border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:ring-emerald-500/20"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 bg-[#111] border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 focus:ring-emerald-500/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
