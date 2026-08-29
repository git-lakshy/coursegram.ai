import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type MetricCardProps = {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  tone?: "neutral" | "accent"
}

export function MetricCard({ label, value, icon: Icon, hint, tone = "neutral" }: MetricCardProps) {
  return (
    <Card className="flex h-full flex-col p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-ink-secondary">{label}</p>
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md",
            tone === "accent" ? "bg-accent-50 text-accent-600" : "bg-background text-ink-muted",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-1.5 truncate text-2xl font-semibold leading-tight text-ink-primary">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
    </Card>
  )
}
