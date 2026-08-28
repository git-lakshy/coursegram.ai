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

export type ProgressResponse = {
  slug: string
  completed: string[]
}

export type StreakResponse = {
  streak_days: number
  events_this_month: number
}

export type ItemStatus = "completed" | "current" | "skipped" | "upcoming"

export type RoadmapStage = {
  id: string
  name: string
  topics: string[]
  milestone?: string
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
  choice_group?: string
}

export type ChoiceGroup = {
  id: string
  prompt: string
  options: string[]
  option_names?: string[]
  header_id: string
}

export type RoadmapGraphResponse = {
  slug: string
  node_count: number
  nodes: GraphNode[]
  choice_groups?: ChoiceGroup[]
}

export type SkillLevel = "beginner" | "intermediate" | "advanced"

export type AccountPlan = "free" | "paid"

export type GoalAnalysisResponse = {
  track_slug: string
  summary: string
  areas: { name: string; topics: string[] }[]
}

export type PlanPhase = { name: string; milestone: string; topics: string[] }

export type PlanResponse = {
  slug: string
  summary: string
  phases: PlanPhase[]
}

export type PersonalizedRoadmap = {
  slug: string
  summary: string
  phases: PlanPhase[]
  created_at: string
}

export type LearnerProfile = {
  display_name: string
  background: string
  skill_level: SkillLevel
  plan: AccountPlan
  target_role_slug: string | null
  known_topics: string[]
  onboarding_complete: boolean
  personalized_roadmap: PersonalizedRoadmap | null
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

export type RoadmapCategoriesResponse = {
  slug: string
  categories: { name: string; topics: string[] }[]
}

export type ResourceItem = {
  id: string
  name: string
  provider: string
  type: string
  url: string
  free: boolean
  level: string
  duration_hours: number | null
  rating: number | null
  description: string | null
  matched_topics: string[]
  score: number | null
}

export type ResourcesResponse = {
  count: number
  resources: ResourceItem[]
}

export type BookmarkMutationResponse = {
  resource_id: string
  bookmarked: boolean
}

export type BookmarksResponse = {
  count: number
  resources: ResourceItem[]
}

export type NextTopicWithResources = {
  id: string
  name: string
  domain: string
  level: string
  keywords: string[]
  resources: ResourceItem[]
}

export type NextWithResourcesResponse = {
  slug: string
  next: NextTopicWithResources[]
}

export type RegenerateRoadmapResponse = {
  slug: string
  personalized_roadmap: PersonalizedRoadmap
}

export type DeleteProfileResponse = {
  deleted: boolean
}

export type StageFeedbackDifficulty = "too_easy" | "just_right" | "too_hard"

export type StageFeedbackItem = {
  stage: string
  position: number
  difficulty: StageFeedbackDifficulty
  submitted_at: string
}

export type StageFeedbackResponse = {
  slug: string
  feedback: StageFeedbackItem[]
}

export type StageFeedbackRequest = {
  slug: string
  stage: string
  position: number
  difficulty: StageFeedbackDifficulty
}

export type StageFeedbackAck = {
  slug: string
  stage: string
  difficulty: StageFeedbackDifficulty
}

export type CourseTrackStatus = "learning" | "completed"

export type TrackedCourse = ResourceItem & {
  status: CourseTrackStatus
  started_at: string
  updated_at: string
}

export type LearningResponse = {
  count: number
  courses: TrackedCourse[]
}

export type LearningStatusResponse = {
  resource_id: string
  status: CourseTrackStatus | null
}

