import { Bookmark, Clock3, Play, Star } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { recordEvent } from "@/lib/api"
import type { CourseTrackStatus, ResourceItem } from "@/types"

type ResourceCardProps = {
  resource: ResourceItem
  saved?: boolean
  onToggleSave?: (resourceId: string) => void
  trackStatus?: CourseTrackStatus
  onSetStatus?: (resourceId: string, status: CourseTrackStatus) => void
}

function TrackingControl({
  resource,
  trackStatus,
  onSetStatus,
}: {
  resource: ResourceItem
  trackStatus?: CourseTrackStatus
  onSetStatus?: (resourceId: string, status: CourseTrackStatus) => void
}) {
  if (onSetStatus === undefined) return null

  if (trackStatus === undefined) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 self-start rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:border-accent-600 hover:text-accent-700"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onSetStatus(resource.id, "learning")
        }}
      >
        <Play className="h-3 w-3" />
        Start learning
      </button>
    )
  }

  const label = trackStatus === "learning" ? "Learning" : "Completed"
  const nextAction = trackStatus === "learning" ? "Mark completed" : "Learn again"
  return (
    <div className="flex items-center gap-1.5 self-start">
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          trackStatus === "learning"
            ? "bg-blue-50 text-blue-700"
            : "bg-accent-50 text-accent-700"
        }`}
      >
        {label}
      </span>
      <button
        type="button"
        className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:border-accent-600 hover:text-accent-700"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onSetStatus(resource.id, trackStatus === "learning" ? "completed" : "learning")
        }}
      >
        {nextAction}
      </button>
    </div>
  )
}

export function ResourceCard({
  resource,
  saved,
  onToggleSave,
  trackStatus,
  onSetStatus,
}: ResourceCardProps) {
  const { token } = useAuth()

  function handleOpen() {
    if (token !== null) {
      void recordEvent(token, "resource_opened", {
        resource_id: resource.id,
        provider: resource.provider,
        type: resource.type,
      }).catch(() => undefined)
    }
  }

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      onClick={handleOpen}
      className="relative flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-background"
    >
      {onToggleSave ? (
        <button
          type="button"
          aria-label={saved ? "Remove bookmark" : "Add bookmark"}
          className="absolute top-2 right-2 rounded p-1 text-ink-muted transition-colors hover:bg-background hover:text-accent-700"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onToggleSave(resource.id)
          }}
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} fill={saved ? "currentColor" : "none"} />
        </button>
      ) : null}
      <div className={`flex items-center justify-between gap-2 ${onToggleSave ? "pr-7" : ""}`}>
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          {resource.provider} · {resource.type}
        </span>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            resource.free ? "bg-emerald-100 text-emerald-700" : "bg-background text-ink-secondary"
          }`}
        >
          {resource.free ? "Free" : "Paid"}
        </span>
      </div>

      <p className="text-sm font-medium leading-snug text-ink-primary">{resource.name}</p>

      <div className="flex items-center gap-3 text-xs text-ink-secondary">
        {resource.rating !== null ? (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" />
            {resource.rating.toFixed(1)}
          </span>
        ) : null}
        {resource.duration_hours !== null ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {resource.duration_hours} hrs
          </span>
        ) : null}
      </div>

      {resource.description ? (
        <p className="line-clamp-2 text-xs text-ink-secondary">{resource.description}</p>
      ) : null}

      {resource.reason ? (
        <p className="text-[10px] leading-snug text-accent-700">Why this: {resource.reason}</p>
      ) : null}

      <TrackingControl resource={resource} trackStatus={trackStatus} onSetStatus={onSetStatus} />
    </a>
  )
}
