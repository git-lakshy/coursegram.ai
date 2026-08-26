import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { RoadmapItem } from "@/components/roadmap/RoadmapItem"
import type { ItemStatus, RoadmapStage as RoadmapStageType } from "@/types"

type RoadmapStageProps = {
  stage: RoadmapStageType
  stageNumber: number
  completedTopics: string[]
  onToggleTopic: (topic: string) => void
  defaultOpen?: boolean
}

function getTopicStatus(
  topic: string,
  completedTopics: string[],
  nextTopic: string | undefined,
  skipped: Set<string>,
): ItemStatus {
  if (completedTopics.includes(topic)) return "completed"
  if (topic === nextTopic) return "current"
  if (skipped.has(topic)) return "skipped"
  return "upcoming"
}

export function RoadmapStage({ stage, stageNumber, completedTopics, onToggleTopic, defaultOpen }: RoadmapStageProps) {
  const completedCount = stage.topics.filter((topic) => completedTopics.includes(topic)).length
  const percent = stage.topics.length > 0 ? Math.round((completedCount / stage.topics.length) * 100) : 0
  const nextTopic = stage.topics.find((topic) => !completedTopics.includes(topic))
  const nextIndex = nextTopic !== undefined ? stage.topics.indexOf(nextTopic) : -1
  // Anything left uncompleted after the learner has moved past it counts
  // as skipped, so the "Next up" marker can never appear stuck.
  const skipped = new Set(
    nextIndex >= 0 ? stage.topics.slice(nextIndex + 1).filter((topic) => !completedTopics.includes(topic)) : [],
  )

  return (
    <AccordionItem defaultOpen={defaultOpen}>
      <AccordionTrigger>
        <div className="flex w-full items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-ink-secondary">
            {stageNumber}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-primary">{stage.name}</p>
            <p className="truncate text-xs text-ink-muted">
              {stage.milestone ? `${stage.milestone} | ` : ""}
              {stage.topics.slice(0, 3).join(", ")}
            </p>
          </div>
          <div className="w-24 shrink-0">
            <Progress value={percent} />
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-ink-secondary">
            {completedCount} / {stage.topics.length}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-0.5 pl-9">
          {stage.topics.map((topic) => (
            <RoadmapItem
              key={topic}
              topic={topic}
              status={getTopicStatus(topic, completedTopics, nextTopic, skipped)}
              onToggle={() => onToggleTopic(topic)}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
