import type { RoadmapStage } from "@/types"

/**
 * The backend returns a flat, ordered topic list per roadmap slug. It does
 * not group topics into stages. This groups the flat list into fixed size
 * chunks so the UI can render a staged progression. It is a presentation
 * grouping only, not data from the backend.
 */
export function groupTopicsIntoStages(slug: string, topics: string[], chunkSize = 12): RoadmapStage[] {
  const stages: RoadmapStage[] = []
  for (let index = 0; index < topics.length; index += chunkSize) {
    const chunk = topics.slice(index, index + chunkSize)
    const stageNumber = stages.length + 1
    stages.push({
      id: `${slug}-stage-${stageNumber}`,
      name: `Stage ${stageNumber}`,
      topics: chunk,
    })
  }
  return stages
}
