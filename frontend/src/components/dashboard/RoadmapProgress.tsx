import { Route } from "lucide-react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { SectionHeader } from "@/components/common/SectionHeader"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { RoadmapStage } from "@/types"

type RoadmapProgressProps = {
  stages: RoadmapStage[]
  completedTopics: string[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

export function RoadmapProgress({ stages, completedTopics, isLoading, isError, onRetry }: RoadmapProgressProps) {
  const totalTopics = stages.reduce((sum, stage) => sum + stage.topics.length, 0)
  const completedCount = stages.reduce(
    (sum, stage) => sum + stage.topics.filter((topic) => completedTopics.includes(topic)).length,
    0,
  )
  const percent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0

  return (
    <div>
      <SectionHeader
        title="Roadmap progress"
        action={
          <Link to="/roadmap" className="text-xs font-medium text-accent-600 hover:text-accent-700">
            View full roadmap
          </Link>
        }
      />

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : isError ? (
        <ErrorState message="Could not load your roadmap." onRetry={onRetry} />
      ) : stages.length === 0 ? (
        <EmptyState icon={Route} title="No roadmap selected" description="Choose a target role to generate a roadmap." />
      ) : (
        <div className="rounded-lg border border-border bg-surface p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink-primary">
              {completedCount} of {totalTopics} topics complete
            </p>
            <p className="text-sm font-semibold text-accent-600">{percent}%</p>
          </div>
          <Progress value={percent} className="mt-2" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {stages.map((stage) => (
              <span
                key={stage.id}
                className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] text-ink-secondary"
              >
                {stage.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
