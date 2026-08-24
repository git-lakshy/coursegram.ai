import { Clock3 } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { SectionHeader } from "@/components/common/SectionHeader"

export function UpcomingItems({ topics }: { topics: string[] }) {
  return (
    <div>
      <SectionHeader title="Up next" />
      {topics.length === 0 ? (
        <EmptyState icon={Clock3} title="Nothing queued" description="Pick a role to generate your roadmap." />
      ) : (
        <ul className="space-y-1.5">
          {topics.map((topic) => (
            <li key={topic} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-sm">
              <Clock3 className="h-3.5 w-3.5 text-ink-muted" />
              <span className="text-ink-primary">{topic}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
