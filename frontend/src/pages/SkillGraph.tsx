import { useMemo, useState } from "react"
import { Check, CircleDashed, Lock, Waypoints } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocalProgress } from "@/hooks/useLocalProgress"
import { useAuth } from "@/hooks/useAuth"
import { useRoadmapGraph, useRoadmapSlugs } from "@/hooks/useRoadmaps"
import { buildTopicStatusMap } from "@/lib/graphStatus"
import type { TopicStatus } from "@/lib/graphStatus"
import { groupTopicsIntoSkillCategories } from "@/lib/skillCategories"
import { cn } from "@/lib/utils"
import type { GraphNode } from "@/types"

const STATUS_META: Record<TopicStatus, { icon: typeof Check; className: string; label: string }> = {
  completed: { icon: Check, className: "text-accent-600", label: "Completed" },
  ready: { icon: CircleDashed, className: "text-ink-primary", label: "Ready to learn" },
  locked: { icon: Lock, className: "text-ink-muted", label: "Locked, finish prerequisites first" },
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", accent ? "text-accent-700" : "text-ink-primary")}>
        {value}
      </p>
    </div>
  )
}

function TopicRow({ node, status }: { node: GraphNode; status: TopicStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  const prereqNames = node.prerequisites.map((prereq) => prereq.name).join(", ")

  return (
    <li className="group flex items-center gap-2 py-1" title={status === "locked" ? `Requires: ${prereqNames}` : meta.label}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.className)} />
      <span
        className={cn(
          "truncate text-sm",
          status === "completed" && "text-ink-secondary line-through decoration-border",
          status === "ready" && "font-medium text-ink-primary",
          status === "locked" && "text-ink-muted",
        )}
      >
        {node.name}
      </span>
    </li>
  )
}

export function SkillGraph() {
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const { profile } = useAuth()
  const slugsQuery = useRoadmapSlugs()
  const slug = selectedSlug ?? profile?.target_role_slug ?? slugsQuery.data?.slugs[0]

  const graphQuery = useRoadmapGraph(slug)
  const { completedTopics } = useLocalProgress(slug)

  const nodes = useMemo(() => graphQuery.data?.nodes ?? [], [graphQuery.data])
  const statusMap = useMemo(() => buildTopicStatusMap(nodes, completedTopics), [nodes, completedTopics])
  const categories = useMemo(() => groupTopicsIntoSkillCategories(nodes.map((node) => node.name)), [nodes])

  const completedCount = nodes.filter((node) => statusMap.get(node.id) === "completed").length
  const readyCount = nodes.filter((node) => statusMap.get(node.id) === "ready").length
  const lockedCount = nodes.length - completedCount - readyCount
  const progress = nodes.length === 0 ? 0 : Math.round((completedCount / nodes.length) * 100)

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink-primary">Skill Graph</h1>
          <p className="text-sm text-ink-secondary">Topics and prerequisites for your target track.</p>
        </div>
        {slugsQuery.data && slugsQuery.data.slugs.length > 0 ? (
          <Select value={slug} onChange={(event) => setSelectedSlug(event.target.value)}>
            {slugsQuery.data.slugs.map((item) => (
              <option key={item} value={item} className="capitalize">
                {item}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {graphQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-40 w-full" />
            ))}
          </div>
        </div>
      ) : graphQuery.isError ? (
        <ErrorState message="Could not load the skill graph." onRetry={() => graphQuery.refetch()} />
      ) : nodes.length === 0 ? (
        <EmptyState icon={Waypoints} title="No skill graph" description="Select a track to see its topics and prerequisites." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total skills" value={String(nodes.length)} />
            <StatCard label="Completed" value={String(completedCount)} accent />
            <StatCard label="Ready to learn" value={String(readyCount)} />
            <StatCard label="Locked" value={String(lockedCount)} />
          </div>

          <div className="mb-4 rounded-lg border border-border bg-surface px-3.5 py-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-ink-secondary">Overall progress</span>
              <span className="font-semibold tabular-nums text-ink-primary">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((category) => {
              const categoryNodes = nodes.filter((node) => category.topics.includes(node.name))
              const done = categoryNodes.filter((node) => statusMap.get(node.id) === "completed").length
              const categoryProgress = categoryNodes.length === 0 ? 0 : Math.round((done / categoryNodes.length) * 100)
              return (
                <div key={category.id} className="rounded-lg border border-border bg-surface p-3.5">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink-primary">{category.label}</p>
                    <span className="text-xs tabular-nums text-ink-muted">
                      {done} / {categoryNodes.length}
                    </span>
                  </div>
                  <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${categoryProgress}%` }} />
                  </div>
                  <ul className="divide-y divide-border/60">
                    {categoryNodes.map((node) => (
                      <TopicRow key={node.id} node={node} status={statusMap.get(node.id) ?? "locked"} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
