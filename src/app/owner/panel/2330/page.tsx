"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield, User, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OwnerPanelLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if already logged in as SERENE_OWNER
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
      } catch {
        // Not logged in — stay on login page
      }
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
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Owner Panel</h1>
          <p className="text-sm text-muted-foreground">
            Serene CRM administration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9"
                required
                autoFocus
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
                placeholder="Enter password"
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
