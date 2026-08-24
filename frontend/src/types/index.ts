export type Course = {
  id: string | null
  name: string | null
  url: string
}

export type CoursesResponse = {
  count: number
  courses: Course[]
}

export type RoadmapSlugsResponse = {
  slugs: string[]
}

export type RoadmapResponse = {
  slug: string
  topic_count: number
  topics: string[]
}

export type HealthResponse = {
  status: string
}

export type ProgressState = Record<string, string[]>

export type ItemStatus = "completed" | "current" | "upcoming"

export type RoadmapStage = {
  id: string
  name: string
  topics: string[]
}

export type SkillCategory = {
  id: string
  label: string
  topics: string[]
}
