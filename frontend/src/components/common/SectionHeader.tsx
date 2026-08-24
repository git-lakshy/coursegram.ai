import type { ReactNode } from "react"

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-ink-primary">{title}</h2>
      {action}
    </div>
  )
}
