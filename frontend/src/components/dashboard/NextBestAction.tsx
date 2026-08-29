import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ArrowRight, ClipboardCheck, Play, Target } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { getAssessmentStages, getUserProjects } from "@/lib/api"

type NextAction = {
  kind: "assessment" | "project" | "topic"
  title: string
  detail: string
  to: string
}

export function NextBestAction({ slug, nextTopic }: { slug: string; nextTopic: string | null }) {
  const { token } = useAuth()

  const stagesQuery = useQuery({
    queryKey: ["assessment-stages", slug, token],
    queryFn: () => getAssessmentStages(token!, slug),
    enabled: token !== null,
  })
  const projectsQuery = useQuery({
    queryKey: ["user-projects", token],
    queryFn: () => getUserProjects(token!),
    enabled: token !== null,
  })

  let action: NextAction | null = null

  const stages = stagesQuery.data?.stages ?? []
  const assessable = stages.filter(
    (stage) => stage.assessable && (!stage.latest_result || !stage.latest_result.passed),
  )
  if (assessable.length > 0) {
    action = {
      kind: "assessment",
      title: `Take the ${assessable[0].name} assessment`,
      detail: "Validate what you have learned, or find gaps before moving on.",
      to: "/assessments",
    }
  }

  if (action === null) {
    const inProgress = (projectsQuery.data?.projects ?? []).find(
      (project) => project.state === "in_progress",
    )
    if (inProgress !== undefined) {
      action = {
        kind: "project",
        title: "Continue your project",
        detail: "Make progress and request an AI review on new evidence.",
        to: "/projects",
      }
    }
  }

  if (action === null && nextTopic !== null) {
    action = {
      kind: "topic",
      title: `Start: ${nextTopic}`,
      detail: "Mark topics completed as you go to keep the plan current.",
      to: "/roadmap",
    }
  }

  if (action === null) return null

  const Icon = action.kind === "assessment" ? ClipboardCheck : action.kind === "project" ? Play : Target

  return (
    <Link
      to={action.to}
      className="flex items-center gap-2.5 rounded-lg border border-accent-600 bg-accent-50/40 px-3 py-2.5 transition-colors hover:bg-accent-50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent-600 bg-surface text-accent-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-accent-700">
          Next best action
        </p>
        <p className="truncate text-sm font-medium text-ink-primary">{action.title}</p>
        <p className="truncate text-xs text-ink-muted">{action.detail}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
    </Link>
  )
}
