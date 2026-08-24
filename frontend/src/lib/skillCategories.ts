import type { SkillCategory } from "@/types"

/**
 * The backend has no concept of skill categories or proficiency. This maps
 * known topic keywords to a small set of broad categories so the skill
 * snapshot chart has readable axis labels. Topics that do not match a known
 * keyword are grouped under General. This is a local presentation mapping,
 * not data returned by the backend.
 */
const CATEGORY_KEYWORDS: Array<{ id: string; label: string; keywords: string[] }> = [
  { id: "frontend", label: "Frontend", keywords: ["react", "css", "html", "router", "component", "dom", "jsx"] },
  { id: "backend", label: "Backend", keywords: ["flask", "django", "fastapi", "express", "api", "server", "node"] },
  { id: "database", label: "Database", keywords: ["sql", "database", "orm", "hashmap", "tree", "queue", "stack"] },
  { id: "testing", label: "Testing", keywords: ["pytest", "unittest", "test", "tox", "doctest"] },
  { id: "devops", label: "DevOps", keywords: ["devops", "docker", "deployment", "pipenv", "virtualenv", "poetry"] },
]

export function groupTopicsIntoSkillCategories(topics: string[]): SkillCategory[] {
  const categories: SkillCategory[] = CATEGORY_KEYWORDS.map((category) => ({
    id: category.id,
    label: category.label,
    topics: [],
  }))
  const general: SkillCategory = { id: "general", label: "General", topics: [] }

  for (const topic of topics) {
    const lowerTopic = topic.toLowerCase()
    const match = CATEGORY_KEYWORDS.find((category) =>
      category.keywords.some((keyword) => lowerTopic.includes(keyword)),
    )
    if (match) {
      const target = categories.find((category) => category.id === match.id)
      target?.topics.push(topic)
    } else {
      general.topics.push(topic)
    }
  }

  const nonEmpty = categories.filter((category) => category.topics.length > 0)
  return general.topics.length > 0 ? [...nonEmpty, general] : nonEmpty
}
