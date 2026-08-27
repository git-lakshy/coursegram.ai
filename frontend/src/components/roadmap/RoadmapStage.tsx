import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Select } from "@/components/ui/select"
import { RoadmapItem } from "@/components/roadmap/RoadmapItem"
import type { ChoiceGroup, ItemStatus, RoadmapStage as RoadmapStageType } from "@/types"

type RoadmapStageProps = {
  stage: RoadmapStageType
  stageNumber: number
  completedTopics: string[]
  onToggleTopic: (topic: string) => void
  defaultOpen?: boolean
  choiceGroups?: ChoiceGroup[]
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

export function RoadmapStage({ stage, stageNumber, completedTopics, onToggleTopic, defaultOpen, choiceGroups = [] }: RoadmapStageProps & { choiceGroups?: ChoiceGroup[] }) {
  const statuses = getTopicStatuses(stage.topics, completedTopics)
  const completedCount = stage.topics.filter((topic) => completedTopics.includes(topic)).length
  const percent = stage.topics.length > 0 ? Math.round((completedCount / stage.topics.length) * 100) : 0

  // Find choice group for a topic (check both ids and display names)
  const getChoiceGroup = (topic: string): ChoiceGroup | undefined => {
    const lower = topic.toLowerCase()
    return choiceGroups.find((g) => {
      const opts = (g as any).option_names ? (g as any).option_names.map((n: string) => n.toLowerCase()) : g.options.map((o) => o.toLowerCase())
      return opts.includes(lower) || g.options.some((o) => o.toLowerCase() === lower)
    })
  }

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
        <div className="space-y-1 pl-9">
          {stage.topics.map((topic) => {
            const group = getChoiceGroup(topic)
            const status = statuses.get(topic) ?? "upcoming"
            if (group) {
              const isCompleted = completedTopics.includes(topic)
              const displayOptions: string[] = (group as any).option_names || group.options
              return (
                <div key={topic} className="rounded-md border border-accent-200 bg-accent-50/40 p-2">
                  <p className="mb-1.5 text-xs font-medium text-accent-800">{group.prompt} — choose one</p>
                  <div className="flex items-center gap-2">
                    <Select
                      value={topic}
                      onChange={(e) => {
                        const next = e.target.value
                        if (next !== topic) {
                          if (isCompleted) onToggleTopic(topic)
                          onToggleTopic(next)
                        }
                      }}
                      className="flex-1 text-sm"
                    >
                      {displayOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isCompleted ? "bg-accent-600 text-white" : "bg-white text-ink-muted border border-border"
                      }`}
                    >
                      {isCompleted ? "Selected" : "Choose"}
                    </span>
                  </div>
                </div>
              )
            }
            return <RoadmapItem key={topic} topic={topic} status={status} onToggle={() => onToggleTopic(topic)} />
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
