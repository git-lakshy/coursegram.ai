import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Code2, ExternalLink, Github, Link2, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { useRoadmapSlugs } from "@/hooks/useRoadmaps"
import { analyzeProject, getTrackProjects, getUserProjects, setProjectState } from "@/lib/api"
import type { ProjectState, ProjectSuggestion, UserProject } from "@/types"

const STATES: ProjectState[] = ["planned", "in_progress", "completed"]

const STATE_LABELS: Record<ProjectState, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
}

function StatePills({
  state,
  onSelect,
  disabled,
}: {
  state: ProjectState | undefined
  onSelect: (state: ProjectState) => void
  disabled: boolean
}) {
  return (
    <div className="flex gap-1.5">
      {STATES.map((item) => (
        <button
          key={item}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
            state === item
              ? item === "completed"
                ? "border-accent-600 bg-accent-50 text-accent-700"
                : item === "in_progress"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-ink-primary bg-background text-ink-primary"
              : "border-border bg-surface text-ink-secondary hover:border-ink-muted"
          }`}
        >
          {STATE_LABELS[item]}
        </button>
      ))}
    </div>
  )
}

function AnalysisBlock({ analysis }: { analysis: NonNullable<UserProject["analysis"]> }) {
  return (
    <div className="mt-3 space-y-2 rounded-md border border-accent-200 bg-accent-50/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-800">
        <Sparkles className="h-3.5 w-3.5" />
        AI review
      </p>
      <p className="text-xs leading-relaxed text-ink-primary">{analysis.verdict}</p>
      {analysis.strengths.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-ink-primary">Strengths</p>
          <ul className="mt-0.5 list-disc pl-4 text-xs text-ink-secondary">
            {analysis.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis.gaps.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-ink-primary">Gaps</p>
          <ul className="mt-0.5 list-disc pl-4 text-xs text-ink-secondary">
            {analysis.gaps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {analysis.next_steps.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-ink-primary">Next steps</p>
          <ul className="mt-0.5 list-disc pl-4 text-xs text-ink-secondary">
            {analysis.next_steps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function ProjectCard({
  project,
  tracked,
  slug,
}: {
  project: ProjectSuggestion
  tracked: UserProject | undefined
  slug: string
}) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [repoDraft, setRepoDraft] = useState(tracked?.repo_url ?? "")
  const [demoDraft, setDemoDraft] = useState(tracked?.demo_url ?? "")
  const [showEvidence, setShowEvidence] = useState(false)

  const updateMutation = useMutation({
    mutationFn: (input: { state?: ProjectState; repo_url?: string | null; demo_url?: string | null }) =>
      setProjectState(token!, project.id, { slug, ...input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-projects"] })
    },
    onError: () => {
      toast.error("Could not update the project")
    },
  })

  const analyzeMutation = useMutation({
    mutationFn: () => analyzeProject(token!, project.id, slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-projects"] })
      toast.success("Review ready")
    },
    onError: () => {
      toast.error("The AI review could not run")
    },
  })

  const isBusy = updateMutation.isPending || analyzeMutation.isPending

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-primary">{project.title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {project.difficulty} · {project.stage}
          </p>
        </div>
        <StatePills
          state={tracked?.state}
          disabled={isBusy || token === null}
          onSelect={(state) => updateMutation.mutate({ state })}
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{project.description}</p>

      {project.skills.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary">
              {skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEvidence((previous) => !previous)}
          className="text-xs font-medium text-ink-secondary underline hover:text-ink-primary"
        >
          {tracked?.repo_url || tracked?.demo_url ? "Edit evidence" : "Add evidence"}
        </button>
        <button
          type="button"
          disabled={isBusy || token === null || tracked === undefined}
          onClick={() => analyzeMutation.mutate()}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent-700 disabled:opacity-40 hover:underline"
        >
          {analyzeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          AI review
        </button>
        {tracked === undefined ? (
          <span className="text-[10px] text-ink-muted">Set a state to enable the AI review</span>
        ) : null}
      </div>

      {showEvidence ? (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2">
            <Github className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
            <Input
              value={repoDraft}
              onChange={(event) => setRepoDraft(event.target.value)}
              placeholder="Repository URL"
              className="h-8 text-xs"
            />
          </label>
          <label className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
            <Input
              value={demoDraft}
              onChange={(event) => setDemoDraft(event.target.value)}
              placeholder="Live demo URL"
              className="h-8 text-xs"
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() =>
              updateMutation.mutate({
                repo_url: repoDraft.trim() || null,
                demo_url: demoDraft.trim() || null,
              })
            }
          >
            {updateMutation.isPending ? "Saving..." : "Save links"}
          </Button>
        </div>
      ) : null}

      {tracked?.repo_url || tracked?.demo_url ? (
        <div className="mt-2 flex flex-wrap gap-3">
          {tracked.repo_url ? (
            <a href={tracked.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-accent-700">
              <ExternalLink className="h-3 w-3" />
              Repository
            </a>
          ) : null}
          {tracked.demo_url ? (
            <a href={tracked.demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-secondary hover:text-accent-700">
              <ExternalLink className="h-3 w-3" />
              Live demo
            </a>
          ) : null}
        </div>
      ) : null}

      {tracked?.analysis ? <AnalysisBlock analysis={tracked.analysis} /> : null}
    </div>
  )
}

export function Projects() {
  const { profile, token } = useAuth()
  const slugsQuery = useRoadmapSlugs()
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const slug = selectedSlug ?? profile?.target_role_slug ?? undefined

  const trackQuery = useQuery({
    queryKey: ["track-projects", slug],
    queryFn: () => getTrackProjects(slug!),
    enabled: slug !== undefined && slug !== "",
  })
  const userQuery = useQuery({
    queryKey: ["user-projects", token],
    queryFn: () => getUserProjects(token!),
    enabled: token !== null,
  })

  const trackedById = new Map<string, UserProject>()
  for (const row of userQuery.data?.projects ?? []) {
    if (row.slug === slug) trackedById.set(row.project_id, row)
  }

  const completedCount = (trackQuery.data?.projects ?? []).filter(
    (project) => trackedById.get(project.id)?.state === "completed",
  ).length

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">Projects</h1>
          <p className="text-sm text-ink-secondary">
            Applied projects for your track. Set a state, add evidence, get an honest AI review.
            {trackQuery.data ? ` ${completedCount}/${trackQuery.data.count} completed` : ""}
          </p>
        </div>
        {slugsQuery.data && slugsQuery.data.slugs.length > 0 ? (
          <Select
            value={slug ?? ""}
            onChange={(event) => setSelectedSlug(event.target.value)}
            className="w-48 shrink-0"
          >
            {slug === undefined || slug === "" ? <option value="">Select a track</option> : null}
            {slugsQuery.data.slugs.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {slug === undefined || slug === "" ? (
        <EmptyState
          icon={Code2}
          title="No track selected"
          description="Pick a target role to see projects for your roadmap."
        />
      ) : trackQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-32 w-full" />
          ))}
        </div>
      ) : trackQuery.isError ? (
        <ErrorState message="Could not load projects for this track." onRetry={() => trackQuery.refetch()} />
      ) : (
        <div className="space-y-3">
          {trackQuery.data?.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tracked={trackedById.get(project.id)}
              slug={slug}
            />
          ))}
        </div>
      )}
    </div>
  )
}
