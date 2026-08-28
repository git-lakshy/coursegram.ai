import { API_BASE_URL } from "@/lib/config"
import type {
  AccountPlan,
  BookmarksResponse,
  BookmarkMutationResponse,
  ChatMessage,
  ChatResponse,
  CoursesResponse,
  DeleteProfileResponse,
  GoalAnalysisResponse,
  GradeResponse,
  HealthResponse,
  LearnerProfile,
  MeResponse,
  ProgressResponse,
  NextWithResourcesResponse,
  PlanResponse,
  QuizQuestion,
  QuizResponse,
  RegenerateRoadmapResponse,
  ResourcesResponse,
  RoadmapCategoriesResponse,
  RoadmapGraphResponse,
  RoadmapResponse,
  RoadmapSlugsResponse,
  StreakResponse,
} from "@/types"

const TOKEN_KEY = "coursegram.token"

export function storeToken(token: string | null): void {
  if (token === null) {
    window.localStorage.removeItem(TOKEN_KEY)
  } else {
    window.localStorage.setItem(TOKEN_KEY, token)
  }
}

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`
  }

  const response = await fetch(new URL(path, API_BASE_URL).toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    let detail = `Request to ${path} failed with status ${response.status}`
    try {
      const body = (await response.json()) as { detail?: string }
      if (typeof body.detail === "string") {
        detail = body.detail
      }
    } catch {
      // keep the generic message
    }
    throw new ApiError(detail, response.status)
  }
  return (await response.json()) as T
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health")
}

export function getCourses(topic: string, limit = 20): Promise<CoursesResponse> {
  return request<CoursesResponse>(`/courses?topic=${encodeURIComponent(topic)}&limit=${limit}`)
}

export function getRoadmapSlugs(): Promise<RoadmapSlugsResponse> {
  return request<RoadmapSlugsResponse>("/roadmaps")
}

export function getRoadmap(slug: string): Promise<RoadmapResponse> {
  return request<RoadmapResponse>(`/roadmaps/${slug}`)
}

export function getRoadmapGraph(slug: string): Promise<RoadmapGraphResponse> {
  return request<RoadmapGraphResponse>(`/roadmaps/${slug}/graph`)
}

export function getMe(token: string): Promise<MeResponse> {
  return request<MeResponse>("/auth/me", { token })
}

export function getProgress(token: string, slug: string): Promise<ProgressResponse> {
  return request<ProgressResponse>(`/progress/${encodeURIComponent(slug)}`, { token })
}

export function saveProgress(
  token: string,
  slug: string,
  completed: string[],
): Promise<ProgressResponse> {
  return request<ProgressResponse>(`/progress/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: { completed },
    token,
  })
}

export function getProfile(token: string): Promise<LearnerProfile> {
  return request<LearnerProfile>("/profile", { token })
}

export function updateProfile(token: string, profile: LearnerProfile): Promise<LearnerProfile> {
  return request<LearnerProfile>("/profile", { method: "PUT", body: profile, token })
}

export function analyzeGoal(token: string, goalText: string): Promise<GoalAnalysisResponse> {
  return request<GoalAnalysisResponse>("/onboarding/goal", {
    method: "POST",
    body: { goal_text: goalText },
    token,
  })
}

export function generateQuiz(
  token: string,
  slug: string,
  knownTopics: string[],
  skillLevel: string,
): Promise<QuizResponse> {
  return request<QuizResponse>("/onboarding/quiz", {
    method: "POST",
    body: { slug, known_topics: knownTopics, skill_level: skillLevel },
    token,
  })
}

export function gradeQuiz(
  token: string,
  questions: QuizQuestion[],
  answers: number[],
): Promise<GradeResponse> {
  return request<GradeResponse>("/onboarding/grade", {
    method: "POST",
    body: { questions, answers },
    token,
  })
}

export function generatePlan(
  token: string,
  slug: string,
  goalText: string,
  areaLevels: Record<string, string>,
  knownTopics: string[],
): Promise<PlanResponse> {
  return request<PlanResponse>("/onboarding/plan", {
    method: "POST",
    body: { slug, goal_text: goalText, area_levels: areaLevels, known_topics: knownTopics },
    token,
  })
}

export function sendAssistantMessage(
  token: string,
  message: string,
  history: ChatMessage[],
): Promise<ChatResponse> {
  return request<ChatResponse>("/assistant/chat", {
    method: "POST",
    body: { message, history },
    token,
  })
}

export function getRoadmapCategories(slug: string): Promise<RoadmapCategoriesResponse> {
  return request<RoadmapCategoriesResponse>(`/roadmaps/${slug}/categories`)
}

export function getResources(
  topics: string[],
  level: string,
  opts: { free?: boolean; types?: string[]; limit?: number } = {},
): Promise<ResourcesResponse> {
  const params = new URLSearchParams()
  params.set("topics", topics.join(","))
  params.set("level", level)
  if (opts.free !== undefined) {
    params.set("free", String(opts.free))
  }
  if (opts.types !== undefined && opts.types.length > 0) {
    params.set("type", opts.types.join(","))
  }
  params.set("limit", String(opts.limit ?? 6))
  return request<ResourcesResponse>(`/resources?${params.toString()}`)
}

export function getNextWithResources(
  token: string,
  slug: string,
  limitTopics = 3,
  resourcesPerTopic = 3,
): Promise<NextWithResourcesResponse> {
  return request<NextWithResourcesResponse>(
    `/roadmaps/${slug}/next-with-resources?limit_topics=${limitTopics}&resources_per_topic=${resourcesPerTopic}`,
    { token },
  )
}

export { ApiError }

export function listBookmarks(token: string): Promise<BookmarksResponse> {
  return request<BookmarksResponse>("/bookmarks", { token })
}

export function addBookmark(token: string, resourceId: string): Promise<BookmarkMutationResponse> {
  return request<BookmarkMutationResponse>(`/bookmarks/${encodeURIComponent(resourceId)}`, {
    method: "PUT",
    token,
  })
}

export function removeBookmark(
  token: string,
  resourceId: string,
): Promise<BookmarkMutationResponse> {
  return request<BookmarkMutationResponse>(`/bookmarks/${encodeURIComponent(resourceId)}`, {
    method: "DELETE",
    token,
  })
}

export function recordEvent(
  token: string,
  type: string,
  detail: Record<string, unknown> = {},
): Promise<{ recorded: boolean }> {
  return request<{ recorded: boolean }>("/events", {
    method: "POST",
    body: { type, detail },
    token,
  })
}

export function getStreak(token: string): Promise<StreakResponse> {
  return request<StreakResponse>("/streak", { token })
}

export function regenerateRoadmap(token: string, slug: string): Promise<RegenerateRoadmapResponse> {
  return request<RegenerateRoadmapResponse>(`/roadmaps/${encodeURIComponent(slug)}/regenerate`, {
    method: "POST",
    token,
  })
}

export function deleteProfile(token: string): Promise<DeleteProfileResponse> {
  return request<DeleteProfileResponse>("/profile", { method: "DELETE", token })
}

export function updatePlan(token: string, plan: AccountPlan): Promise<LearnerProfile> {
  return request<LearnerProfile>("/plan", { method: "POST", body: { plan }, token })
}

