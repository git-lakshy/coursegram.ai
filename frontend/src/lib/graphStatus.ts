import type { GraphNode } from "@/types"

export type TopicStatus = "completed" | "ready" | "locked"

/**
 * Derive per node status from local progress and the prerequisite edges.
 * A node is ready when every prerequisite is completed, otherwise locked.
 */
export function buildTopicStatusMap(
  nodes: GraphNode[],
  completedTopics: string[],
): Map<string, TopicStatus> {
  const completed = new Set(completedTopics)
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const status = new Map<string, TopicStatus>()

  for (const node of nodes) {
    if (completed.has(node.name)) {
      status.set(node.id, "completed")
      continue
    }
    const unmet = node.prerequisites.filter((prereq) => {
      const prereqNode = byId.get(prereq.id)
      return prereqNode !== undefined && status.get(prereq.id) !== "completed"
    })
    status.set(node.id, unmet.length === 0 ? "ready" : "locked")
  }

  return status
}
