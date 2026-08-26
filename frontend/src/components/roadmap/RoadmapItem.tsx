import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ItemStatus } from "@/types"

const STATUS_BADGES: Record<ItemStatus, { label: string; className: string } | null> = {
  completed: { label: "Completed", className: "bg-accent-100 text-accent-700" },
  current: { label: "Next up", className: "bg-accent-600 text-white" },
  upcoming: { label: "Upcoming", className: "bg-background text-ink-muted border border-border" },
}

export function RoadmapItem({
  topic,
  status,
  onToggle,
}: {
  topic: string
  status: ItemStatus
  onToggle: () => void
}) {
  const badge = STATUS_BADGES[status]
  const completed = status === "completed"

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={completed}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-background",
        completed && "bg-accent-50/60",
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
            completed
              ? "border-accent-600 bg-accent-600 text-white"
              : "border-border bg-surface text-transparent",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        <span
          className={cn(
            "text-ink-primary",
            completed && "text-ink-secondary line-through decoration-accent-600/40",
          )}
        >
          {topic}
        </span>
      </span>
      {badge ? (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      ) : null}
    </button>
  )
}
