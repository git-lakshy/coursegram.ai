import { API_BASE_URL } from "@/lib/config"
import type {
  CoursesResponse,
  HealthResponse,
  RoadmapResponse,
  RoadmapSlugsResponse,
} from "@/types"

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, API_BASE_URL)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed with status ${response.status}`, response.status)
  }
  return (await response.json()) as T
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health")
}

export function getCourses(topic: string, limit = 20): Promise<CoursesResponse> {
  return request<CoursesResponse>("/courses", { topic, limit })
}

export function getRoadmapSlugs(): Promise<RoadmapSlugsResponse> {
  return request<RoadmapSlugsResponse>("/roadmaps")
}

export function getRoadmap(slug: string): Promise<RoadmapResponse> {
  return request<RoadmapResponse>(`/roadmaps/${slug}`)
}

export { ApiError }
