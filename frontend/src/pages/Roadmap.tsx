import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Route } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { ResourceCard } from "@/components/resources/ResourceCard"
import { RoadmapStage } from "@/components/roadmap/RoadmapStage"
import { Accordion } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocalProgress } from "@/hooks/useLocalProgress"
import { useBookmarks } from "@/hooks/useBookmarks"
import { useAuth } from "@/hooks/useAuth"
import { useLearning } from "@/hooks/useLearning"
import { useNextWithResources } from "@/hooks/useResources"
import { useRoadmap, useRoadmapGraph, useRoadmapSlugs } from "@/hooks/useRoadmaps"
import { getStageFeedback, getTrackProjects, getUserProjects, sendStageFeedback } from "@/lib/api"
import { groupTopicsIntoStages } from "@/lib/roadmapStages"
import type { ChoiceGroup, ProjectState, RoadmapStage as RoadmapStageType, StageFeedbackDifficulty, StageFeedbackItem } from "@/types"

function filterChoiceDupes(topics: string[], choiceGroups: ChoiceGroup[] | undefined): string[] {
  if (!choiceGroups?.length) return topics
  const optToGroup = new Map<string, string>()
  for (const g of choiceGroups) for (const o of g.options) optToGroup.set(o.toLowerCase(), g.id)
  // Map topic name -> id is not available here; use lower name as proxy
  // For personalized phases, topics are names like "Java", "C++" - match by lower name
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of topics) {
    // Find if this topic belongs to a choice group by checking if any option's name matches (case-insensitive)
    // We don't have id mapping here, so check by name lower against options lower
    let grp: string | undefined
    for (const g of choiceGroups) {
      const names = (g as any).option_names as string[] | undefined
      const allOpts = names && names.length ? [...g.options, ...names] : g.options
      if (allOpts.some((o) => o.toLowerCase() === t.toLowerCase())) {
        grp = g.id
        break
      }
      if (g.header_id && t.toLowerCase() === g.header_id.toLowerCase()) grp = g.id
    }
    if (grp) {
      if (seen.has(grp)) continue
      seen.add(grp)
    }
    // Drop the header prompt itself if it appears as a topic ("Pick a Language")
    if (/^\s*(pick|choose|select)\b/i.test(t)) continue
    out.push(t)
  }
  return out
}

export function Roadmap() {
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const { profile, token } = useAuth()
  const queryClient = useQueryClient()
  const slugsQuery = useRoadmapSlugs()
  const slug = selectedSlug ?? profile?.target_role_slug ?? undefined

  const roadmapQuery = useRoadmap(slug)
  const { completedTopics, toggleTopic } = useLocalProgress(slug)
  const nextResourcesQuery = useNextWithResources(slug, Boolean(token))
  const { bookmarkedIds, toggleBookmark } = useBookmarks()
  const { statusMap: learningStatus, setStatus: setTrackStatus } = useLearning()
  const nextTopics = nextResourcesQuery.data?.next ?? []

  const feedbackQuery = useQuery({
    queryKey: ["stage-feedback", slug],
    queryFn: () => getStageFeedback(token!, slug!),
    enabled: token !== null && slug !== undefined && slug !== "",
  })
  const feedbackByStage = new Map<string, StageFeedbackItem>()
  for (const item of feedbackQuery.data?.feedback ?? []) {
    feedbackByStage.set(item.stage, item)
  }

  const feedbackMutation = useMutation({
    mutationFn: (input: { stage: string; position: number; difficulty: StageFeedbackDifficulty }) =>
      sendStageFeedback(token!, {
        slug: slug!,
        stage: input.stage,
        position: input.position,
        difficulty: input.difficulty,
      }),
    onSuccess: (ack, variables) => {
      queryClient.setQueryData<StageFeedbackItem[]>(["stage-feedback", slug], (previous) => {
        const next = (previous ?? []).filter((item) => item.stage !== ack.stage)
        next.push({
          stage: ack.stage,
          position: variables.position,
          difficulty: ack.difficulty,
          submitted_at: new Date().toISOString(),
        })
        return next
      })
      toast.success("Feedback saved")
    },
    onError: () => {
      toast.error("Could not save feedback")
    },
  })

  async function handleStageFeedback(stage: string, position: number, difficulty: StageFeedbackDifficulty) {
    if (token === null || slug === undefined || slug === "") return
    await feedbackMutation.mutateAsync({ stage, position, difficulty })
  }

  const topics = roadmapQuery.data?.topics ?? []
  const graphQuery = useRoadmapGraph(slug)
  const choiceGroups = graphQuery.data?.choice_groups ?? []
  const trackProjectsQuery = useQuery({
    queryKey: ["track-projects", slug],
    queryFn: () => getTrackProjects(slug!),
    enabled: slug !== undefined && slug !== "",
  })
  const userProjectsQuery = useQuery({
    queryKey: ["user-projects", token],
    queryFn: () => getUserProjects(token!),
    enabled: token !== null,
  })
  const personalized = profile?.personalized_roadmap
  const usePersonalized =
    personalized !== null && personalized !== undefined && personalized.slug === slug
  const stages: RoadmapStageType[] = usePersonalized
    ? personalized.phases.map((phase, index) => ({
        id: `${slug}-phase-${index + 1}`,
        name: phase.name,
        topics: filterChoiceDupes(phase.topics, choiceGroups),
        milestone: phase.milestone,
      }))
    : groupTopicsIntoStages(slug ?? "roadmap", filterChoiceDupes(topics, choiceGroups))

  const trackedProjects = new Map<string, ProjectState>()
  for (const row of userProjectsQuery.data?.projects ?? []) {
    if (row.slug === slug) trackedProjects.set(row.project_id, row.state)
  }
  const stageProjectMap = new Map<number, { title: string; state?: ProjectState }>()
  if (trackProjectsQuery.data !== undefined) {
    stages.forEach((stage, index) => {
      const match = trackProjectsQuery.data.projects.find((project) =>
        project.related_topics.some((topic) => stage.topics.includes(topic)),
      )
      if (match) {
        stageProjectMap.set(index, { title: match.title, state: trackedProjects.get(match.id) })
      }
    })
  }

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
          <Select
            value={slug}
            onChange={(event) => setSelectedSlug(event.target.value)}
            className="w-48 shrink-0 self-start"
          >
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
              choiceGroups={choiceGroups}
              onToggleTopic={toggleTopic}
              defaultOpen={index === 0}
              feedback={feedbackByStage.get(stage.name)}
              onFeedback={token !== null ? (difficulty) => handleStageFeedback(stage.name, index + 1, difficulty) : undefined}
              project={stageProjectMap.get(index)}
            />
          ))}
        </Accordion>
      )}

      {nextResourcesQuery.isLoading ? (
        <div className="mt-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink-primary">Resources for your next topics</h2>
          {[0, 1].map((key) => (
            <div key={key} className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((cardKey) => (
                  <Skeleton key={cardKey} className="h-28 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : nextResourcesQuery.isError ? (
        <p className="mt-6 text-xs text-ink-muted">
          Could not load resources.
          <button
            type="button"
            onClick={() => nextResourcesQuery.refetch()}
            className="ml-1 font-medium underline hover:text-ink-secondary"
          >
            Retry
          </button>
        </p>
      ) : nextTopics.length > 0 ? (
        <section className="mt-6 space-y-5">
          <h2 className="text-sm font-semibold text-ink-primary">Resources for your next topics</h2>
          {nextTopics.map((topic) => (
            <div key={topic.id}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-medium capitalize text-ink-primary">{topic.name}</h3>
                <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  {topic.level}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {topic.resources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    saved={bookmarkedIds.has(resource.id)}
                    onToggleSave={toggleBookmark}
                    trackStatus={learningStatus.get(resource.id)}
                    onSetStatus={token !== null ? (id, status) => void setTrackStatus(id, status) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
