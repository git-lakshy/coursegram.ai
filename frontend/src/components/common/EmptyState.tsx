import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <Icon className="h-5 w-5 text-ink-muted" />
      <p className="text-sm font-medium text-ink-primary">{title}</p>
      <p className="max-w-sm text-sm text-ink-secondary">{description}</p>
      {actionLabel && onAction ? (
        <Button variant="accent" size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
