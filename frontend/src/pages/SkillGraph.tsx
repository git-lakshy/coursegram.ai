import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts"
import {
  BrainCircuit,
  Check,
  CircleDashed,
  Lock,
  Search,
  Waypoints,
} from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocalProgress } from "@/hooks/useLocalProgress"
import { useAuth } from "@/hooks/useAuth"
import { useRoadmapGraph, useRoadmapSlugs } from "@/hooks/useRoadmaps"
import { buildTopicStatusMap } from "@/lib/graphStatus"
import type { TopicStatus } from "@/lib/graphStatus"
import { groupTopicsIntoSkillCategories } from "@/lib/skillCategories"
import { cn } from "@/lib/utils"

type ViewMode = "graph" | "table"

const STATUS_META: Record<TopicStatus, { icon: typeof Check; className: string; label: string }> = {
  completed: { icon: Check, className: "text-accent-600", label: "Completed" },
  ready: { icon: CircleDashed, className: "text-ink-primary", label: "Ready to learn" },
  locked: { icon: Lock, className: "text-ink-muted", label: "Locked, finish prerequisites first" },
}

function matchLabel(percent: number): string {
  if (percent >= 60) return "Good"
  if (percent >= 30) return "Fair"
  return "Needs focus"
}

function matchTone(percent: number): string {
  if (percent >= 60) return "text-accent-700"
  if (percent >= 30) return "text-ink-primary"
  return "text-amber-600"
}

function SummaryCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", accent ? "text-accent-700" : "text-ink-primary")}>
        {value}
      </p>
      <p className="text-[11px] text-ink-muted">{detail}</p>
    </div>
  )
}

export function SkillGraph() {
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const [view, setView] = useState<ViewMode>("graph")
  const [search, setSearch] = useState("")
  const { profile } = useAuth()
  const slugsQuery = useRoadmapSlugs()
  const slug = selectedSlug ?? profile?.target_role_slug ?? undefined

  const graphQuery = useRoadmapGraph(slug)
  const { completedTopics } = useLocalProgress(slug)

  const nodes = useMemo(() => graphQuery.data?.nodes ?? [], [graphQuery.data])
  const statusMap = useMemo(() => buildTopicStatusMap(nodes, completedTopics), [nodes, completedTopics])
  const categories = useMemo(() => groupTopicsIntoSkillCategories(nodes.map((node) => node.name)), [nodes])

  const completedCount = nodes.filter((node) => statusMap.get(node.id) === "completed").length
  const readyCount = nodes.filter((node) => statusMap.get(node.id) === "ready").length
  const lockedCount = nodes.length - completedCount - readyCount
  const matchPercent = nodes.length === 0 ? 0 : Math.round((completedCount / nodes.length) * 100)

  const categoryStats = categories.map((category) => {
    const categoryNodes = nodes.filter((node) => category.topics.includes(node.name))
    const done = categoryNodes.filter((node) => statusMap.get(node.id) === "completed").length
    const percent = categoryNodes.length === 0 ? 0 : Math.round((done / categoryNodes.length) * 100)
    return { category, total: categoryNodes.length, done, percent }
  })

  // Top gaps follow track order, which encodes prerequisite priority.
  const topGaps = nodes
    .filter((node) => statusMap.get(node.id) !== "completed")
    .slice(0, 5)
    .map((node) => ({
      node,
      category: categories.find((category) => category.topics.includes(node.name))?.label ?? "General",
      priority: statusMap.get(node.id) === "ready" ? "HIGH" : "MEDIUM",
    }))

  const filteredNodes = nodes.filter((node) => {
    if (search.trim() === "") return true
    const term = search.toLowerCase()
    return (
      node.name.toLowerCase().includes(term) ||
      (categories.find((category) => category.topics.includes(node.name))?.label ?? "").toLowerCase().includes(term)
    )
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink-primary">Skill Graph</h1>
          <p className="text-sm text-ink-secondary">
            Visualize your skills, track gaps and focus on what matters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            Target role
            <Select value={slug ?? ""} onChange={(event) => setSelectedSlug(event.target.value)}>
              <option value="">Choose a track</option>
              {(slugsQuery.data?.slugs ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      {slug === undefined || slug === null || slug === "" ? (
        <EmptyState
          icon={Waypoints}
          title="No target role set"
          description="Complete onboarding to generate your personalized skill graph."
        />
      ) : graphQuery.isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[0, 1, 2, 3, 4].map((key) => (
              <Skeleton key={key} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : graphQuery.isError ? (
        <ErrorState message="Could not load the skill graph." onRetry={() => graphQuery.refetch()} />
      ) : nodes.length === 0 ? (
        <EmptyState
          icon={Waypoints}
          title="No skill graph yet"
          description="Complete your onboarding assessment to generate your personalized skill graph."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <SummaryCard label="Overall match" value={`${matchPercent}%`} detail={matchLabel(matchPercent)} accent />
            <SummaryCard label="Skills mastered" value={String(completedCount)} detail={`${matchPercent}% of total`} />
            <SummaryCard label="In progress" value={String(readyCount)} detail="Ready to learn now" />
            <SummaryCard label="To learn" value={String(lockedCount)} detail="Prerequisites pending" />
            <SummaryCard label="Total skills" value={String(nodes.length)} detail={`Across ${categories.length} categories`} />
          </div>

          <div className="mb-4 flex items-center gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
            {(["graph", "table"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                  view === mode ? "bg-background text-ink-primary shadow-sm" : "text-ink-muted hover:text-ink-secondary",
                )}
              >
                {mode} view
              </button>
            ))}
          </div>

          {view === "graph" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="mb-1 text-sm font-semibold text-ink-primary">Skill radar</p>
                <p className="mb-2 text-xs text-ink-muted">Your completed share per category against full coverage.</p>
                <div className="h-80 w-full">
                  <ResponsiveRadar categoryStats={categoryStats} />
                </div>
                <div className="mt-1 flex items-center justify-center gap-4 text-xs text-ink-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-accent-600" />
                    Your level
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-ink-muted" />
                    Required
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="mb-2 text-sm font-semibold text-ink-primary">Skill category breakdown</p>
                <div className="space-y-3">
                  {categoryStats.map(({ category, total, done, percent }) => (
                    <div key={category.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-ink-primary">{category.label}</span>
                        <span className="text-ink-muted tabular-nums">
                          {done} / {total} skills
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${percent}%` }} />
                        </div>
                        <span className={cn("w-10 text-right text-[11px] font-semibold tabular-nums", matchTone(percent))}>
                          {matchLabel(percent)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface">
              <div className="border-b border-border p-3">
                <div className="relative max-w-xs">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills..." className="pl-8" />
                </div>
              </div>
              <div className="max-h-[28rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-border text-left text-xs text-ink-muted">
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Skill</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNodes.map((node) => {
                      const status = statusMap.get(node.id) ?? "locked"
                      const meta = STATUS_META[status]
                      const Icon = meta.icon
                      const category = categories.find((item) => item.topics.includes(node.name))?.label ?? "General"
                      return (
                        <tr key={node.id} className="border-b border-border/60 last:border-b-0 hover:bg-background">
                          <td className="px-3 py-2 text-xs text-ink-muted">{category}</td>
                          <td className="px-3 py-2 text-ink-primary">{node.name}</td>
                          <td className="px-3 py-2">
                            <span className={cn("inline-flex items-center gap-1 text-xs", meta.className)}>
                              <Icon className="h-3 w-3" />
                              {meta.label.split(",")[0]}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredNodes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-xs text-ink-muted">
                          No skills match your search.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-border bg-surface p-3">
            <p className="text-sm font-semibold text-ink-primary">Top skill gaps to focus on</p>
            <p className="mb-2 text-xs text-ink-muted">Earliest incomplete skills in track order, prerequisites first.</p>
            <div className="flex flex-wrap gap-2">
              {topGaps.map(({ node, category, priority }) => (
                <div key={node.id} className="flex flex-col rounded-lg border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-primary">{node.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        priority === "HIGH" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600",
                      )}
                    >
                      {priority}
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-muted">{category}</span>
                </div>
              ))}
              {topGaps.length === 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-accent-700">
                  <BrainCircuit className="h-4 w-4" />
                  Track complete. Nothing left to learn here.
                </p>
              ) : null}
            </div>
            <Link
              to="/roadmap"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline"
            >
              Continue on your roadmap to close these gaps
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function ResponsiveRadar({
  categoryStats,
}: {
  categoryStats: Array<{ category: { id: string; label: string }; percent: number }>
}) {
  const data = categoryStats.map((item) => ({ skill: item.category.label, value: item.percent, required: 100 }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
        <PolarGrid stroke="#E5E7EB" />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "#6B7280" }} />
        <Radar name="Required" dataKey="required" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.08} />
        <Radar name="Your level" dataKey="value" stroke="#059669" fill="#059669" fillOpacity={0.25} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
