import { CircleCheck, CircleDot, Lock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ItemStatus } from "@/types"

const STATUS_CONFIG: Record<ItemStatus, { label: string; variant: "accent" | "neutral" | "outline" }> = {
  completed: { label: "Completed", variant: "accent" },
  current: { label: "In progress", variant: "outline" },
  skipped: { label: "Skipped", variant: "neutral" },
  upcoming: { label: "Upcoming", variant: "neutral" },
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className="gap-1">
      {status === "completed" ? (
        <CircleCheck className="h-3 w-3" />
      ) : status === "current" ? (
        <CircleDot className="h-3 w-3" />
      ) : (
        <Lock className="h-3 w-3" />
      )}
      {config.label}
    </Badge>
  )
}
