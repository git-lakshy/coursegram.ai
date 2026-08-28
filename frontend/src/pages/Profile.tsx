import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CreditCard, Crown } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { getRoadmapSlugs, updatePlan, updateProfile } from "@/lib/api"
import type { LearnerProfile, SkillLevel } from "@/types"

const SKILL_LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced"]

export function Profile() {
  const { token, email, user, profile, setProfile } = useAuth()
  const [draft, setDraft] = useState<LearnerProfile | null>(profile)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPlan, setIsChangingPlan] = useState(false)

  const slugsQuery = useQuery({
    queryKey: ["roadmap-slugs"],
    queryFn: () => getRoadmapSlugs(),
    enabled: token !== null,
  })

  useEffect(() => {
    setDraft(profile)
  }, [profile])

  if (token === null || draft === null) {
    return null
  }

  const memberSince = user?.metadata?.creationTime
  const provider = user?.providerData[0]?.providerId

  function patch(partial: Partial<LearnerProfile>) {
    setDraft((previous) => (previous === null ? previous : { ...previous, ...partial }))
  }

  async function handleSave() {
    if (draft === null || token === null) return
    setIsSaving(true)
    try {
      const saved = await updateProfile(token, draft)
      setProfile(saved)
      toast.success("Profile saved")
    } catch {
      toast.error("Could not save profile. Is the backend running?")
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePlanChange() {
    if (draft === null || token === null) return
    const next = draft.plan === "free" ? "paid" : "free"
    setIsChangingPlan(true)
    try {
      const saved = await updatePlan(token, next)
      setDraft(saved)
      setProfile(saved)
      toast.success(next === "paid" ? "Upgraded to the paid plan" : "Switched to the free plan")
    } catch {
      toast.error("Could not change plan. Is the backend running?")
    } finally {
      setIsChangingPlan(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">Profile</h1>
        <p className="text-sm text-ink-secondary">Your learner details and target role.</p>
      </div>

      <Card className="mb-4 flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
          {(draft.display_name || email || "L").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-primary">{email}</p>
          <p className="text-xs text-ink-muted">
            {provider === "google.com" ? "Google sign in" : "Email and password"}
            {memberSince ? ` since ${new Date(memberSince).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            draft.plan === "paid" ? "bg-accent-50 text-accent-700 border border-accent-600" : "bg-background text-ink-secondary border border-border"
          }`}
        >
          {draft.plan}
        </span>
      </Card>

      <Card className="mb-4 flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
              draft.plan === "paid" ? "bg-accent-50 text-accent-700" : "bg-background text-ink-secondary border border-border"
            }`}
          >
            {draft.plan === "paid" ? <Crown className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-primary">{draft.plan === "paid" ? "Paid plan" : "Free plan"}</p>
            <p className="text-xs text-ink-muted">
              {draft.plan === "paid" ? "You are on the paid plan" : "Upgrade to the paid plan anytime"}
            </p>
          </div>
        </div>
        <Button variant={draft.plan === "free" ? "accent" : "outline"} size="sm" onClick={handlePlanChange} disabled={isChangingPlan}>
          {isChangingPlan ? "Working..." : draft.plan === "free" ? "Upgrade" : "Switch to free"}
        </Button>
      </Card>

      <Card className="space-y-4 p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-secondary">Display name</span>
          <Input
            value={draft.display_name}
            onChange={(event) => patch({ display_name: event.target.value })}
            placeholder="Your name"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-secondary">Background</span>
          <Input
            value={draft.background}
            onChange={(event) => patch({ background: event.target.value })}
            placeholder="Short description of where you are coming from"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">Skill level</span>
            <Select
              className="w-full"
              value={draft.skill_level}
              onChange={(event) => patch({ skill_level: event.target.value as SkillLevel })}
            >
              {SKILL_LEVELS.map((level) => (
                <option key={level} value={level} className="capitalize">
                  {level}
                </option>
              ))}
            </Select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">Target role</span>
            <Select
              className="w-full"
              value={draft.target_role_slug ?? ""}
              onChange={(event) =>
                patch({ target_role_slug: event.target.value === "" ? null : event.target.value })
              }
            >
              <option value="">Not set</option>
              {(slugsQuery.data?.slugs ?? []).map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="flex justify-end">
          <Button variant="accent" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
