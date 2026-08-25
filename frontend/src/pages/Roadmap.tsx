import { useState } from "react"
import { Link } from "react-router-dom"
import { Route } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { RoadmapStage } from "@/components/roadmap/RoadmapStage"
import { Accordion } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocalProgress } from "@/hooks/useLocalProgress"
import { useAuth } from "@/hooks/useAuth"
import { useRoadmap, useRoadmapSlugs } from "@/hooks/useRoadmaps"
import { groupTopicsIntoStages } from "@/lib/roadmapStages"
import type { RoadmapStage as RoadmapStageType } from "@/types"

export function Roadmap() {
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const { profile } = useAuth()
  const slugsQuery = useRoadmapSlugs()
  const slug = selectedSlug ?? profile?.target_role_slug ?? undefined

  const roadmapQuery = useRoadmap(slug)
  const { completedTopics, toggleTopic } = useLocalProgress(slug)

  const topics = roadmapQuery.data?.topics ?? []
  const personalized = profile?.personalized_roadmap
  const usePersonalized =
    personalized !== null && personalized !== undefined && personalized.slug === slug
  const stages: RoadmapStageType[] = usePersonalized
    ? personalized.phases.map((phase, index) => ({
        id: `${slug}-phase-${index + 1}`,
        name: phase.name,
        topics: phase.topics,
        milestone: phase.milestone,
      }))
    : groupTopicsIntoStages(slug ?? "roadmap", topics)

  if (slug === undefined || slug === null || slug === "") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-5">
        <h1 className="mb-4 text-lg font-semibold text-ink-primary">My roadmap</h1>
        <EmptyState
          icon={Route}
          title="No roadmap yet"
          description="Pick a target role and we will build your learning path."
        />
        <div className="flex justify-center">
          <Link to="/onboarding">
            <Button variant="accent">Create my roadmap</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">My roadmap</h1>
          <p className="text-sm text-ink-secondary">
            {usePersonalized && personalized
              ? personalized.summary
              : "Track topic by topic progress toward your target role."}
          </p>
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
