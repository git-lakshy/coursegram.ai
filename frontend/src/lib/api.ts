import { API_BASE_URL } from "@/lib/config"
import type {
  AuthResponse,
  ChatMessage,
  ChatResponse,
  CoursesResponse,
  GradeResponse,
  HealthResponse,
  LearnerProfile,
  MeResponse,
  QuizQuestion,
  QuizResponse,
  RoadmapGraphResponse,
  RoadmapResponse,
  RoadmapSlugsResponse,
} from "@/types"

const TOKEN_KEY = "coursegram.token"

export function readToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

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
    throw new ApiError(`Request to ${path} failed with status ${response.status}`, response.status)
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

export function register(email: string, password: string, displayName: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: { email, password, display_name: displayName },
  })
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  })
}

export function getMe(token: string): Promise<MeResponse> {
  return request<MeResponse>("/auth/me", { token })
}

export function getProfile(token: string): Promise<LearnerProfile> {
  return request<LearnerProfile>("/profile", { token })
}

export function updateProfile(token: string, profile: LearnerProfile): Promise<LearnerProfile> {
  return request<LearnerProfile>("/profile", { method: "PUT", body: profile, token })
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

export { ApiError }
