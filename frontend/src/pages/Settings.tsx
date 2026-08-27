import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardCheck, LogOut, RefreshCw, Route, Target, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { saveProgress } from "@/lib/api"

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-ink-primary">{title}</h2>
      <p className="mb-3 text-xs text-ink-secondary">{description}</p>
      <div className="space-y-2">{children}</div>
    </Card>
  )
}

function Row({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
}: {
  icon: typeof Route
  title: string
  description: string
  action: React.ReactNode
  variant?: "default" | "danger"
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 ${variant === "danger" ? "border-red-200 bg-red-50/50" : "border-border bg-background"}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${variant === "danger" ? "bg-red-100 text-red-600" : "bg-surface text-ink-secondary border border-border"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className={`text-sm font-medium ${variant === "danger" ? "text-red-700" : "text-ink-primary"}`}>{title}</p>
          <p className="text-xs text-ink-muted">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export function Settings() {
  const { token, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)

  const slug = profile?.target_role_slug

  async function handleRegenerate() {
    if (!token || !slug) {
      toast.error("No target track set")
      return
    }
    setBusy("regenerate")
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/roadmaps/${slug}/regenerate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Roadmap regenerated")
      navigate("/roadmap")
    } catch {
      toast.error("Could not regenerate roadmap")
    } finally {
      setBusy(null)
    }
  }

  async function handleClearProgress() {
    if (!token || !slug) {
      toast.error("No track selected")
      return
    }
    setBusy("clear")
    try {
      await saveProgress(token, slug, [])
      toast.success("Progress cleared for this track")
    } catch {
      toast.error("Could not clear progress")
    } finally {
      setBusy(null)
    }
  }

  async function handleDeleteProfile() {
    if (!token) return
    if (!confirm("Delete your profile, progress, and roadmaps? This cannot be undone.")) return
    setBusy("delete")
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/profile`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Profile deleted")
      logout()
      navigate("/login")
    } catch {
      toast.error("Could not delete profile")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">Settings</h1>
        <p className="text-sm text-ink-secondary">Manage your learning preferences and account.</p>
      </div>

      <div className="space-y-4">
        <Section title="Learning" description="Update your goal and learning path.">
          <Row
            icon={Target}
            title="Change goal"
            description="Update your background and target role"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/onboarding")}>
                Change
              </Button>
            }
          />
          <Row
            icon={ClipboardCheck}
            title="Retake analysis quiz"
            description="Reassess your skill level with a new quiz"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/onboarding")}>
                Retake
              </Button>
            }
          />
          <Row
            icon={Route}
            title="Recreate roadmap"
            description={slug ? `Regenerate your ${slug} roadmap` : "No track selected"}
            action={
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={busy === "regenerate" || !slug}>
                {busy === "regenerate" ? "Working..." : "Recreate"}
              </Button>
            }
          />
        </Section>

        <Section title="Progress" description="Manage your learning progress.">
          <Row
            icon={RefreshCw}
            title="Clear progress"
            description={slug ? `Reset completed topics for ${slug}` : "No track selected"}
            action={
              <Button variant="outline" size="sm" onClick={handleClearProgress} disabled={busy === "clear" || !slug}>
                {busy === "clear" ? "Clearing..." : "Clear"}
              </Button>
            }
          />
        </Section>

        <Section title="Account" description="Danger zone — these actions cannot be undone.">
          <Row
            icon={Trash2}
            title="Delete profile"
            description="Permanently delete your profile and all progress"
            variant="danger"
            action={
              <Button variant="outline" size="sm" onClick={handleDeleteProfile} disabled={busy === "delete"} className="border-red-200 text-red-600 hover:bg-red-50">
                {busy === "delete" ? "Deleting..." : "Delete"}
              </Button>
            }
          />
          <Row
            icon={LogOut}
            title="Sign out"
            description="Sign out from this device"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout()
                  navigate("/login")
                }}
              >
                Sign out
              </Button>
            }
          />
        </Section>
      </div>
    </div>
  )
}
