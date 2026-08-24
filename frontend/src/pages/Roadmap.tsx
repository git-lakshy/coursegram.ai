import { useState } from "react"
import { Route } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { RoadmapStage } from "@/components/roadmap/RoadmapStage"
import { Accordion } from "@/components/ui/accordion"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocalProgress } from "@/hooks/useLocalProgress"
import { useRoadmap, useRoadmapSlugs } from "@/hooks/useRoadmaps"
import { groupTopicsIntoStages } from "@/lib/roadmapStages"

export function Roadmap() {
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const slugsQuery = useRoadmapSlugs()
  const slug = selectedSlug ?? slugsQuery.data?.slugs[0]

  const roadmapQuery = useRoadmap(slug)
  const { completedTopics, toggleTopic } = useLocalProgress(slug)

  const topics = roadmapQuery.data?.topics ?? []
  const stages = groupTopicsIntoStages(slug ?? "roadmap", topics)

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">My roadmap</h1>
          <p className="text-sm text-ink-secondary">Track topic by topic progress toward your target role.</p>
        </div>
        {slugsQuery.data && slugsQuery.data.slugs.length > 0 ? (
          <Select value={slug} onChange={(event) => setSelectedSlug(event.target.value)}>
            {slugsQuery.data.slugs.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {roadmapQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-12 w-full" />
          ))}
        </div>
      ) : roadmapQuery.isError ? (
        <ErrorState message="Could not load this roadmap." onRetry={() => roadmapQuery.refetch()} />
      ) : stages.length === 0 ? (
        <EmptyState icon={Route} title="No roadmap available" description="Select a roadmap slug to see its topics." />
      ) : (
        <Accordion>
          {stages.map((stage, index) => (
            <RoadmapStage
              key={stage.id}
              stage={stage}
              stageNumber={index + 1}
              completedTopics={completedTopics}
              onToggleTopic={toggleTopic}
              defaultOpen={index === 0}
            />
          ))}
        </Accordion>
      )}
    </div>
  )
}
