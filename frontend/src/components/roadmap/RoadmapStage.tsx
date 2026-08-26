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

function getTopicStatuses(topics: string[], completedTopics: string[]) {
  const completedSet = new Set(completedTopics)
  const statuses = new Map<string, ItemStatus>()
  // A topic is skipped only when the learner completed something AFTER
  // it while leaving it uncompleted. "Next up" is the first topic that
  // is neither completed nor passed over.
  let seenCompleted = false
  const skipped = new Set<string>()
  for (let index = topics.length - 1; index >= 0; index -= 1) {
    const topic = topics[index]
    if (completedSet.has(topic)) {
      seenCompleted = true
      statuses.set(topic, "completed")
    } else if (seenCompleted) {
      skipped.add(topic)
      statuses.set(topic, "skipped")
    } else {
      statuses.set(topic, "upcoming")
    }
  }
  const nextTopic = topics.find((topic) => statuses.get(topic) === "upcoming")
  if (nextTopic !== undefined) {
    statuses.set(nextTopic, "current")
  }
  return statuses
}

export function RoadmapStage({ stage, stageNumber, completedTopics, onToggleTopic, defaultOpen }: RoadmapStageProps) {
  const statuses = getTopicStatuses(stage.topics, completedTopics)
  const completedCount = stage.topics.filter((topic) => completedTopics.includes(topic)).length
  const percent = stage.topics.length > 0 ? Math.round((completedCount / stage.topics.length) * 100) : 0

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
              status={statuses.get(topic) ?? "upcoming"}
              onToggle={() => onToggleTopic(topic)}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
