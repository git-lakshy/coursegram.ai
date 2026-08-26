import { useState } from "react"
import { Link } from "react-router-dom"
import { ChartNoAxesCombined, Route, Target, Waypoints } from "lucide-react"

import { AiAssistantPanel } from "@/components/dashboard/AiAssistantPanel"
import { EmptyState } from "@/components/common/EmptyState"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { RecommendedCourses } from "@/components/dashboard/RecommendedCourses"
import { ResourceCard } from "@/components/resources/ResourceCard"
import { RoadmapProgress } from "@/components/dashboard/RoadmapProgress"
import { SkillSnapshot } from "@/components/dashboard/SkillSnapshot"
import { UpcomingItems } from "@/components/dashboard/UpcomingItems"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useCourses } from "@/hooks/useCourses"
import { useLocalProgress } from "@/hooks/useLocalProgress"
import { useNextWithResources } from "@/hooks/useResources"
import { useRoadmap, useRoadmapSlugs } from "@/hooks/useRoadmaps"
import { groupTopicsIntoStages } from "@/lib/roadmapStages"

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function Dashboard() {
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const { profile, token } = useAuth()
  const { data: slugsData } = useRoadmapSlugs()
  const slug = selectedSlug ?? profile?.target_role_slug ?? undefined

  const roadmapQuery = useRoadmap(slug)
  const { completedTopics } = useLocalProgress(slug)

  const personalized = profile?.personalized_roadmap
  const usePersonalized =
    personalized !== null && personalized !== undefined && personalized.slug === slug
  const topics = usePersonalized
    ? personalized.phases.flatMap((phase) => phase.topics)
    : roadmapQuery.data?.topics ?? []
  const stages = usePersonalized
    ? personalized.phases.map((phase, index) => ({
        id: `${slug}-phase-${index + 1}`,
        name: phase.name,
        topics: phase.topics,
        milestone: phase.milestone,
      }))
    : groupTopicsIntoStages(slug ?? "roadmap", topics)
  const nextTopic = topics.find((topic) => !completedTopics.includes(topic))
  const upcomingTopics = topics.filter((topic) => !completedTopics.includes(topic)).slice(0, 5)

  const coursesQuery = useCourses(nextTopic ?? "", 4)
  const matchedResourcesQuery = useNextWithResources(slug, Boolean(token))
  const matchedResources = (matchedResourcesQuery.data?.next ?? [])
    .flatMap((topic) => topic.resources)
    .slice(0, 4)

  const totalTopics = topics.length
  const completedCount = completedTopics.filter((topic) => topics.includes(topic)).length
  const percent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0
  const displayName = profile?.display_name.trim() || "learner"

  if (slug === undefined || slug === null || slug === "") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-5">
        <h1 className="text-lg font-semibold tracking-tight text-ink-primary">
          {greeting()}, {displayName}
        </h1>
        <EmptyState
          icon={Route}
          title="No roadmap yet"
          description="Tell Coursegram what role you are targeting and we will build your learning path."
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
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink-primary">
            {greeting()}, {displayName}
          </h1>
          <p className="flex flex-wrap items-center gap-1 text-sm text-ink-secondary">
            Let us continue building your path to
            {slugsData && slugsData.slugs.length > 0 ? (
              <Select
                className="ml-1 h-7 border-none bg-transparent px-1 font-semibold capitalize text-accent-700 hover:bg-background"
                value={slug}
                onChange={(event) => setSelectedSlug(event.target.value)}
              >
                {slugsData.slugs.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="font-semibold capitalize text-accent-700">{slug}</span>
            )}
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Overall progress" value={`${percent}%`} icon={ChartNoAxesCombined} tone="accent" />
        <MetricCard label="Skills learned" value={`${completedCount} / ${totalTopics}`} icon={Route} />
        <MetricCard label="Next up" value={nextTopic ?? "All caught up"} icon={Target} />
        <MetricCard label="Skill gaps" value={`${totalTopics - completedCount} to go`} icon={Waypoints} />
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
          {matchedResourcesQuery.isError || matchedResources.length === 0 ? null : (
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Matched resources
              </p>
              {matchedResourcesQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((key) => (
                    <Skeleton key={key} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto">
                  {matchedResources.map((resource) => (
                    <div key={resource.id} className="w-56 shrink-0">
                      <ResourceCard resource={resource} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <RecommendedCourses
            courses={coursesQuery.data?.courses ?? []}
            isLoading={coursesQuery.isLoading}
            isError={coursesQuery.isError}
            matchedTopic={nextTopic}
            onRetry={() => coursesQuery.refetch()}
          />
        </div>
        <div className="space-y-5">
          <AiAssistantPanel nextTopic={nextTopic ?? null} />
          <SkillSnapshot
            allTopics={topics}
            completedTopics={completedTopics}
            isLoading={roadmapQuery.isLoading}
            slug={slug}
          />
          <UpcomingItems topics={upcomingTopics} />
          <Link
            to="/skill-graph"
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm font-medium text-ink-primary transition-colors hover:bg-background"
          >
            View full skill graph
            <ChartNoAxesCombined className="h-4 w-4 text-ink-muted" />
          </Link>
        </div>
      </div>
    </div>
  )
}
