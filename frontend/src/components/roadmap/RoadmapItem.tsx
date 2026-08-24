import { CircleCheck, CircleDot, Circle } from "lucide-react"

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
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-background"
    >
      <span className="flex items-center gap-2">
        {status === "completed" ? (
          <CircleCheck className="h-3.5 w-3.5 text-accent-600" />
        ) : status === "current" ? (
          <CircleDot className="h-3.5 w-3.5 text-ink-primary" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-ink-muted" />
        )}
        <span className={cn("text-ink-primary", status === "completed" && "text-ink-secondary")}>{topic}</span>
      </span>
      <span className="text-xs text-ink-muted">
        {status === "completed" ? "Completed" : status === "current" ? "Next" : ""}
      </span>
    </button>
  )
}
