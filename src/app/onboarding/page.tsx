"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function OnboardingPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/onboarding/create-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: orgName.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to create organization")
      window.location.href = "/dashboard"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Create your organization</h1>
          <p className="text-sm text-muted-foreground">
            Enter your organization name to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              placeholder="e.g. Acme Solutions"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !orgName.trim()}>
            {loading ? "Creating..." : "Continue to Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  )
}
