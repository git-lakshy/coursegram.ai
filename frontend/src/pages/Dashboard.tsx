import { useState } from "react"
import { ChartNoAxesCombined, Route, Sparkles, Target } from "lucide-react"

import { AiAssistantPanel } from "@/components/dashboard/AiAssistantPanel"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { RecommendedCourses } from "@/components/dashboard/RecommendedCourses"
import { RoadmapProgress } from "@/components/dashboard/RoadmapProgress"
import { SkillSnapshot } from "@/components/dashboard/SkillSnapshot"
import { UpcomingItems } from "@/components/dashboard/UpcomingItems"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { useCourses } from "@/hooks/useCourses"
import { useLocalProgress } from "@/hooks/useLocalProgress"
import { useRoadmap, useRoadmapSlugs } from "@/hooks/useRoadmaps"
import { groupTopicsIntoStages } from "@/lib/roadmapStages"

export function Dashboard() {
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const { profile } = useAuth()
  const { data: slugsData } = useRoadmapSlugs()
  const slug = selectedSlug ?? profile?.target_role_slug ?? slugsData?.slugs[0]

  const roadmapQuery = useRoadmap(slug)
  const { completedTopics } = useLocalProgress(slug)

  const topics = roadmapQuery.data?.topics ?? []
  const stages = groupTopicsIntoStages(slug ?? "roadmap", topics)
  const nextTopic = topics.find((topic) => !completedTopics.includes(topic))
  const upcomingTopics = topics.filter((topic) => !completedTopics.includes(topic)).slice(0, 5)

  const coursesQuery = useCourses(nextTopic ?? "", 4)

  const totalTopics = topics.length
  const completedCount = completedTopics.filter((topic) => topics.includes(topic)).length
  const percent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">Welcome back</h1>
          <p className="text-sm text-ink-secondary">Here is where your learning stands today.</p>
        </div>
        {slugsData && slugsData.slugs.length > 0 ? (
          <Select value={slug} onChange={(event) => setSelectedSlug(event.target.value)}>
            {slugsData.slugs.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Roadmap progress" value={`${percent}%`} icon={ChartNoAxesCombined} tone="accent" />
        <MetricCard label="Topics completed" value={`${completedCount} / ${totalTopics}`} icon={Route} />
        <MetricCard label="Next up" value={nextTopic ?? "All caught up"} icon={Target} />
        <MetricCard label="Assistant" value="Not connected" icon={Sparkles} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <RoadmapProgress
            stages={stages}
            completedTopics={completedTopics}
            isLoading={roadmapQuery.isLoading}
            isError={roadmapQuery.isError}
            onRetry={() => roadmapQuery.refetch()}
          />
          <RecommendedCourses
            courses={coursesQuery.data?.courses ?? []}
            isLoading={coursesQuery.isLoading}
            isError={coursesQuery.isError}
            matchedTopic={nextTopic}
            onRetry={() => coursesQuery.refetch()}
          />
          <SkillSnapshot allTopics={topics} completedTopics={completedTopics} isLoading={roadmapQuery.isLoading} />
        </div>
        <div className="space-y-5">
          <AiAssistantPanel />
          <UpcomingItems topics={upcomingTopics} />
        </div>
      </div>
    </div>
  )
}
