import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { getRoadmapSlugs, updateProfile } from "@/lib/api"
import type { LearnerProfile, SkillLevel } from "@/types"

const SKILL_LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced"]

export function Profile() {
  const { token, email, profile, setProfile } = useAuth()
  const [draft, setDraft] = useState<LearnerProfile | null>(profile)
  const [isSaving, setIsSaving] = useState(false)

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
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-primary">{email}</p>
          <p className="text-xs text-ink-muted">Free plan</p>
        </div>
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
