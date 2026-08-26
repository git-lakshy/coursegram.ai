import { CircleCheck, Circle, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ItemStatus } from "@/types"

export function RoadmapItem({
  topic,
  status,
  onToggle,
}: {
  topic: string
  status: ItemStatus
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-background"
    >
      <span className="flex items-center gap-2">
        {status === "completed" ? (
          <CircleCheck className="h-3.5 w-3.5 text-accent-600" />
        ) : status === "current" ? (
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-600">
            <Play className="h-2 w-2 fill-white text-white" />
          </span>
        ) : (
          <Circle className="h-3.5 w-3.5 text-ink-muted" />
        )}
        <span className={cn("text-ink-primary", status === "completed" && "text-ink-secondary")}>{topic}</span>
      </span>
      <span
        className={cn(
          "text-xs",
          status === "completed" && "font-medium text-accent-700",
          status === "current" && "font-medium text-accent-600",
          status === "upcoming" && "text-ink-muted",
        )}
      >
        {status === "completed" ? "Completed" : status === "current" ? "Next up" : "Upcoming"}
      </span>
    </button>
  )
}
