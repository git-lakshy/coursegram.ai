import { useQuery } from "@tanstack/react-query"

import { useAuth } from "@/hooks/useAuth"
import { getProgressTimeline } from "@/lib/api"

export function WeeklyActivityChart({ slug }: { slug: string }) {
  const { token } = useAuth()
  const query = useQuery({
    queryKey: ["progress-timeline", slug, token],
    queryFn: () => getProgressTimeline(token!, slug),
    enabled: token !== null,
  })

  const weeks = query.data?.weeks ?? []
  const max = Math.max(1, ...weeks.map((week) => week.count))

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Skill development, last {weeks.length || 8} weeks
        </p>
        <p className="text-xs text-ink-secondary">
          {weeks.reduce((total, week) => total + week.count, 0)} topics completed
        </p>
      </div>
      {query.isLoading ? (
        <div className="flex h-16 items-end gap-1.5">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-10 flex-1 animate-pulse rounded-sm bg-background" />
          ))}
        </div>
      ) : weeks.length === 0 ? (
        <p className="py-3 text-center text-xs text-ink-muted">
          Complete topics on your roadmap to see your progress here.
        </p>
      ) : (
        <div className="flex h-16 items-end gap-1.5">
          {weeks.map((week) => (
            <div
              key={week.week_start}
              title={`${week.count} topics, week of ${week.week_start}`}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={`w-full rounded-sm ${week.count > 0 ? "bg-accent-600" : "bg-border"}`}
                style={{ height: `${Math.max(8, (week.count / max) * 56)}px` }}
              />
              <span className="text-[9px] text-ink-muted">{week.week_start.slice(5)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
