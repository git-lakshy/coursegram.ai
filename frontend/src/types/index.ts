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

export type GraphPrerequisite = {
  id: string
  name: string
}

export type GraphNode = {
  id: string
  name: string
  prerequisites: GraphPrerequisite[]
}

export type RoadmapGraphResponse = {
  slug: string
  node_count: number
  nodes: GraphNode[]
}

export type SkillLevel = "beginner" | "intermediate" | "advanced"

export type LearnerProfile = {
  display_name: string
  background: string
  skill_level: SkillLevel
  target_role_slug: string | null
  known_topics: string[]
  onboarding_complete: boolean
}

export type AuthResponse = {
  access_token: string
  token_type: string
  email: string
}

export type MeResponse = {
  email: string
}

export type QuizQuestion = {
  id: string
  question: string
  options: string[]
  answer_index: number
  topic: string
}

export type QuizResponse = {
  slug: string
  questions: QuizQuestion[]
}

export type GradeResponse = {
  score: number
  total: number
  recommended_level: SkillLevel
  summary: string
}

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type ChatResponse = {
  reply: string
}
