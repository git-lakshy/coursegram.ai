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
  interests: string[]
  weekly_hours: number | null
  preferred_formats: string[]
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

export type AssistantAction = {
  type: string
  topics?: string[]
  stage_position?: number | null
  stage_name?: string | null
  stage_topics?: string[]
  milestone?: string | null
  level?: string | null
  resource_id?: string | null
  status?: string | null
  project_id?: string | null
  state?: string | null
  hint?: string | null
  goal?: string | null
}

export type AssistantActionProposal = {
  action: AssistantAction
  summary: string
}

export type AssistantExecuteResult = {
  type: string
  applied: boolean
  summary?: string
  reason?: string
  project_id?: string
  stage?: string
  question_count?: number
  topics?: string[]
}

export type AssistantExecuteResponse = {
  results: AssistantExecuteResult[]
}

export type ChatResponse = {
  reply: string
  actions: AssistantAction[]
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
  reason?: string
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

export type ProjectSuggestion = {
  id: string
  title: string
  description: string
  stage: string
  difficulty: string
  skills: string[]
  related_topics: string[]
}

export type TrackProjectsResponse = {
  slug: string
  count: number
  projects: ProjectSuggestion[]
}

export type ProjectAnalysis = {
  verdict: string
  strengths: string[]
  gaps: string[]
  next_steps: string[]
  analyzed_at?: string
}

export type ProjectState = "planned" | "in_progress" | "completed"

export type UserProject = {
  project_id: string
  slug: string
  state: ProjectState
  repo_url: string | null
  demo_url: string | null
  analysis: ProjectAnalysis | null
  updated_at: string
}

export type UserProjectsResponse = {
  count: number
  projects: UserProject[]
}

export type ProjectUpdateResponse = {
  project_id: string
  state: ProjectState
  repo_url: string | null
  demo_url: string | null
}

export type ProjectAnalysisResponse = {
  project_id: string
  analysis: ProjectAnalysis
}

export type AssessmentStage = {
  name: string
  position: number
  topics: string[]
  milestone: string
  completed_count: number
  completed_topics: string[]
  is_current: boolean
  assessable: boolean
  latest_result: {
    stage: string
    score: number
    total: number
    passed: boolean
    detail: Record<string, unknown>
    created_at: string
  } | null
}

export type AssessmentStagesResponse = {
  slug: string
  stages: AssessmentStage[]
}

export type AssessmentGenerateResponse = {
  stage: string
  position: number
  questions: QuizQuestion[]
}

export type AssessmentSubmitResponse = {
  slug: string
  stage: string
  position: number
  score: number
  total: number
  passed: boolean
  summary: string
  revisit_topics: string[]
  resources: ResourceItem[]
}

export type AssessmentHistoryResponse = {
  slug: string
  count: number
  results: {
    stage: string
    score: number
    total: number
    passed: boolean
    created_at: string
  }[]
}

export type ChatHistoryMessage = {
  role: "user" | "assistant"
  content: string
  created_at: string
}

export type ChatHistoryResponse = {
  messages: ChatHistoryMessage[]
}

export type ProgressTimelineResponse = {
  slug: string
  weeks: { week_start: string; count: number }[]
}

