import { useState } from "react"
import { Network } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocalProgress } from "@/hooks/useLocalProgress"
import { useRoadmap, useRoadmapSlugs } from "@/hooks/useRoadmaps"
import { groupTopicsIntoSkillCategories } from "@/lib/skillCategories"

export function SkillGraph() {
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const slugsQuery = useRoadmapSlugs()
  const slug = selectedSlug ?? slugsQuery.data?.slugs[0]

  const roadmapQuery = useRoadmap(slug)
  const { completedTopics } = useLocalProgress(slug)

  const topics = roadmapQuery.data?.topics ?? []
  const categories = groupTopicsIntoSkillCategories(topics)

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">Skill graph</h1>
          <p className="text-sm text-ink-secondary">Roadmap topics grouped by skill area.</p>
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
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-24 w-full" />
          ))}
        </div>
      ) : roadmapQuery.isError ? (
        <ErrorState message="Could not load skill data." onRetry={() => roadmapQuery.refetch()} />
      ) : categories.length === 0 ? (
        <EmptyState icon={Network} title="No skill data" description="Select a roadmap to see its skill breakdown." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((category) => {
            const completedCount = category.topics.filter((topic) => completedTopics.includes(topic)).length
            return (
              <div key={category.id} className="rounded-lg border border-border bg-surface p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-primary">{category.label}</p>
                  <span className="text-xs text-ink-muted">
                    {completedCount} / {category.topics.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {category.topics.map((topic) => (
                    <li key={topic} className="text-sm text-ink-secondary">
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
