import { Link } from "react-router-dom"
import { UserRoundPlus } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"

function missingParts(
  profile: NonNullable<ReturnType<typeof useAuth>["profile"]>,
): string[] {
  const missing: string[] = []
  if (profile.display_name.trim() === "") missing.push("display name")
  if (profile.background.trim() === "") missing.push("background")
  if (profile.interests.length === 0) missing.push("interests")
  if (profile.weekly_hours === null) missing.push("weekly study hours")
  if (profile.preferred_formats.length === 0) missing.push("preferred formats")
  return missing
}

export function ProfileCompletionCard() {
  const { profile } = useAuth()
  if (profile === null) return null
  const missing = missingParts(profile)
  if (missing.length === 0) return null

  return (
    <Link
      to="/profile"
      className="flex items-center gap-2.5 rounded-lg border border-accent-200 bg-accent-50/40 px-3 py-2.5 transition-colors hover:bg-accent-50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent-600 bg-surface text-accent-700">
        <UserRoundPlus className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-primary">Complete your profile</p>
        <p className="truncate text-xs text-ink-secondary">
          Missing: {missing.join(", ")}. It makes recommendations fit you better.
        </p>
      </div>
    </Link>
  )
}
