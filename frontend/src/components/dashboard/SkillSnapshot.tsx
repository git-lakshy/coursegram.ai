import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts"

import { EmptyState } from "@/components/common/EmptyState"
import { SectionHeader } from "@/components/common/SectionHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { groupTopicsIntoSkillCategories } from "@/lib/skillCategories"
import { BrainCircuit } from "lucide-react"

type SkillSnapshotProps = {
  allTopics: string[]
  completedTopics: string[]
  isLoading: boolean
}

export function SkillSnapshot({ allTopics, completedTopics, isLoading }: SkillSnapshotProps) {
  const categories = groupTopicsIntoSkillCategories(allTopics)
  const chartData = categories.map((category) => {
    const completedCount = category.topics.filter((topic) => completedTopics.includes(topic)).length
    const percent = category.topics.length > 0 ? Math.round((completedCount / category.topics.length) * 100) : 0
    return { skill: category.label, value: percent }
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
              <Radar dataKey="value" stroke="#059669" fill="#059669" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
