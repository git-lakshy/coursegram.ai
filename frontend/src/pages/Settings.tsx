import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ClipboardCheck, ListChecks, LogOut, RefreshCw, Route, Target, Trash2, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { ApiError, deleteProfile, getProgress, regenerateRoadmap, saveProgress } from "@/lib/api"

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
  icon: LucideIcon
  title: string
  description: string
  action: React.ReactNode
  variant?: "default" | "danger"
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 ${variant === "danger" ? "border-red-200 bg-red-50/50" : "border-border bg-background"}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${variant === "danger" ? "bg-red-100 text-red-600" : "bg-surface text-ink-secondary border border-border"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium ${variant === "danger" ? "text-red-700" : "text-ink-primary"}`}>{title}</p>
          <p className="truncate text-xs text-ink-muted">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function StatTile({ icon: Icon, label, value, loading }: { icon: LucideIcon; label: string; value: string; loading?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-ink-secondary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink-primary">{loading ? "..." : value}</p>
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
    </div>
  )
}

function providerLabel(providerId: string | undefined): string {
  if (providerId === "google.com") return "Google sign in"
  if (providerId === "password") return "Email and password"
  return "Signed in"
}

export function Settings() {
  const { token, email, user, profile, setProfile, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)

  const slug = profile?.target_role_slug ?? null

  const progressQuery = useQuery({
    queryKey: ["progress", slug],
    queryFn: () => getProgress(token!, slug!),
    enabled: token !== null && slug !== null,
  })

  const completedCount = progressQuery.data?.completed.length ?? 0
  const phaseCount = profile?.personalized_roadmap?.phases.length ?? 0
  const memberSince = user?.metadata?.creationTime

  function errorText(err: unknown): string {
    if (err instanceof ApiError && err.message) return err.message
    return "Something went wrong. Try again."
  }

  async function handleRegenerate() {
    if (!token || !slug) {
      toast.error("No target track set")
      return
    }
    setBusy("regenerate")
    try {
      const res = await regenerateRoadmap(token, slug)
      if (profile) {
        setProfile({ ...profile, personalized_roadmap: res.personalized_roadmap })
      }
      toast.success("Roadmap regenerated")
      navigate("/roadmap")
    } catch (err) {
      toast.error(errorText(err))
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
      const res = await saveProgress(token, slug, [])
      queryClient.setQueryData(["progress", slug], res)
      await queryClient.invalidateQueries({ queryKey: ["next-with-resources", slug] })
      await queryClient.invalidateQueries({ queryKey: ["streak"] })
      toast.success("Progress cleared for this track")
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setBusy(null)
    }
  }

  async function handleDeleteProfile() {
    if (!token) return
    if (!confirm("Delete your profile, progress, bookmarks, and activity? This cannot be undone.")) return
    setBusy("delete")
    try {
      await deleteProfile(token)
      toast.success("Profile deleted")
      logout()
      navigate("/login")
    } catch (err) {
      toast.error(errorText(err))
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
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
            {(profile?.display_name || email || "L").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-primary">{email}</p>
            <p className="text-xs text-ink-muted">
              {providerLabel(user?.providerData[0]?.providerId)}
              {memberSince ? ` since ${new Date(memberSince).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}` : ""}
            </p>
          </div>
          {profile ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                profile.plan === "paid" ? "border-accent-600 bg-accent-50 text-accent-700" : "border-border bg-background text-ink-secondary"
              }`}
            >
              {profile.plan}
            </span>
          ) : null}
        </Card>

        {slug ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <StatTile icon={Target} label="Target track" value={slug} />
            <StatTile
              icon={ListChecks}
              label={slug ? `Completed on ${slug}` : "Completed topics"}
              value={`${completedCount} topics`}
              loading={progressQuery.isLoading}
            />
            <StatTile icon={Route} label="Phases in your plan" value={`${phaseCount} phases`} />
          </div>
        ) : null}

        <Section title="Learning" description={`Level: ${profile?.skill_level ?? "not set"}. Update your goal and learning path.`}>
          <Row
            icon={Target}
            title="Change goal"
            description={slug ? `Current track: ${slug}` : "No track selected yet"}
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/onboarding")}>
                Change
              </Button>
            }
          />
          <Row
            icon={ClipboardCheck}
            title="Retake analysis quiz"
            description={slug ? `New placement quiz on ${slug} fundamentals` : "Select a track first"}
            action={
              <Button variant="outline" size="sm" onClick={() => navigate("/onboarding", { state: { retake: true } })}>
                Retake
              </Button>
            }
          />
          <Row
            icon={Route}
            title="Recreate roadmap"
            description={slug ? `Regenerate your ${slug} plan from current knowledge` : "No track selected"}
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
            description={
              !slug
                ? "No track selected"
                : progressQuery.isLoading
                  ? "Loading progress..."
                  : progressQuery.isError
                    ? "Could not load progress"
                    : `Reset ${completedCount} completed ${completedCount === 1 ? "topic" : "topics"} on ${slug}`
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearProgress}
                disabled={busy === "clear" || !slug || progressQuery.isLoading}
              >
                {busy === "clear" ? "Clearing..." : "Clear"}
              </Button>
            }
          />
        </Section>

        <Section title="Account" description="Danger zone: these actions cannot be undone.">
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
