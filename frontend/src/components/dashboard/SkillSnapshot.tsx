import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts"

import { EmptyState } from "@/components/common/EmptyState"
import { SectionHeader } from "@/components/common/SectionHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { groupTopicsIntoSkillCategories } from "@/lib/skillCategories"
import { useRoadmapCategories } from "@/hooks/useRoadmaps"
import type { SkillCategory } from "@/types"
import { BrainCircuit } from "lucide-react"

type SkillSnapshotProps = {
  allTopics: string[]
  completedTopics: string[]
  isLoading: boolean
  slug?: string
}

function categoriesFromResponse(
  data: { slug: string; categories: { name: string; topics: string[] }[] } | undefined,
): SkillCategory[] | undefined {
  if (!data || data.categories.length === 0) return undefined
  return data.categories.map((category) => ({
    id: category.name.toLowerCase(),
    label: category.name,
    topics: category.topics,
  }))
}

export function SkillSnapshot({ allTopics, completedTopics, isLoading, slug }: SkillSnapshotProps) {
  const categoriesQuery = useRoadmapCategories(slug)
  const fallback = groupTopicsIntoSkillCategories(allTopics)
  const categories = categoriesFromResponse(categoriesQuery.data) ?? fallback
  const chartData = categories.map((category) => {
    const completedCount = category.topics.filter((topic) => completedTopics.includes(topic)).length
    const percent = category.topics.length > 0 ? Math.round((completedCount / category.topics.length) * 100) : 0
    return { skill: category.label, value: percent, required: 100 }
  })

  return (
    <div>
      <SectionHeader title="Skill snapshot" />
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : chartData.length === 0 ? (
        <EmptyState
          icon={BrainCircuit}
          title="No skill data yet"
          description="Select a roadmap to see your skill breakdown here."
        />
      ) : (
        <div className="h-56 w-full rounded-lg border border-border bg-surface p-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <Radar name="Required" dataKey="required" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.08} />
              <Radar name="Your level" dataKey="value" stroke="#059669" fill="#059669" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      {chartData.length > 0 ? (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-accent-600" />
              Your level
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-ink-muted" />
              Required
            </span>
          </div>
          <Link to="/skill-graph" className="flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline">
            View skill graph
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}
    </div>
  )
}
