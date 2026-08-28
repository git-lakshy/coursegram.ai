import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { getLearning, removeLearning, setLearningStatus } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import type { CourseTrackStatus } from "@/types"

/**
 * Course tracking per learner: which curated resources the learner is
 * currently learning or has completed. Signed in learners sync to the
 * backend; guests see an empty set since tracking is account level.
 */
export function useLearning() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["learning", token],
    queryFn: () => getLearning(token!),
    enabled: token !== null,
  })

  const statusMap = new Map<string, CourseTrackStatus>()
  for (const course of query.data?.courses ?? []) {
    statusMap.set(course.id, course.status)
  }

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["learning"] })
  }, [queryClient])

  const setStatus = useCallback(
    async (resourceId: string, status: CourseTrackStatus) => {
      if (token === null) {
        toast.error("Sign in to track courses")
        return
      }
      try {
        await setLearningStatus(token, resourceId, status)
        invalidate()
      } catch {
        toast.error("Could not update course tracking")
      }
    },
    [token, invalidate],
  )

  const remove = useCallback(
    async (resourceId: string) => {
      if (token === null) return
      try {
        await removeLearning(token, resourceId)
        invalidate()
      } catch {
        toast.error("Could not stop tracking this course")
      }
    },
    [token, invalidate],
  )

  const isBusy = query.isFetching

  return {
    statusMap,
    courses: query.data?.courses ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    setStatus,
    remove,
    isBusy,
  }
}

