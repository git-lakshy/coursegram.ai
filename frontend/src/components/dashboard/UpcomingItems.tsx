import { Clock3 } from "lucide-react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/common/EmptyState"
import { SectionHeader } from "@/components/common/SectionHeader"

export function UpcomingItems({ topics }: { topics: string[] }) {
  return (
    <div>
      <SectionHeader title="Up next" />
      {topics.length === 0 ? (
        <EmptyState icon={Clock3} title="Nothing queued" description="Pick a role to generate your roadmap." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <ul>
            {topics.map((topic, index) => (
              <li key={topic}>
                <Link
                  to="/roadmap"
                  className={`flex items-center gap-2 px-2.5 py-2 text-sm transition-colors hover:bg-background ${
                    index > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <Clock3 className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                  <span className="truncate text-ink-primary">{topic}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/skill-graph"
            className="flex items-center justify-between border-t border-border px-2.5 py-2 text-xs font-medium text-accent-700 transition-colors hover:bg-background"
          >
            View full skill graph
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  )
}
