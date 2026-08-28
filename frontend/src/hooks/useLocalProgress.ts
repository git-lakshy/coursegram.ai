import { useCallback, useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getProgress, saveProgress } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import type { ProgressState } from "@/types"

const STORAGE_KEY = "coursegram.progress.v1"

function readStoredProgress(): ProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressState) : {}
  } catch {
    return {}
  }
}

/**
 * Topic completion per roadmap slug. Signed in learners sync to the
 * backend (and completed topics feed known_topics server side); guests
 * fall back to localStorage only.
 */
export function useLocalProgress(slug: string | undefined) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [localState, setLocalState] = useState<ProgressState>(() => readStoredProgress())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localState))
  }, [localState])

  const serverQuery = useQuery({
    queryKey: ["progress", slug],
    queryFn: () => getProgress(token!, slug!),
    enabled: token !== null && slug !== undefined,
  })

  useEffect(() => {
    if (token === null || slug === undefined || serverQuery.data === undefined) return
    setLocalState((previous) => ({ ...previous, [slug]: serverQuery.data.completed }))
  }, [token, slug, serverQuery.data])

  const mutation = useMutation({
    mutationFn: (completed: string[]) => saveProgress(token!, slug!, completed),
    onSuccess: (data) => {
      queryClient.setQueryData(["progress", slug], data)
    },
  })

  const completedTopics = slug
    ? token !== null
      ? serverQuery.data?.completed ?? []
      : localState[slug] ?? []
    : []

  const toggleTopic = useCallback(
    (topic: string) => {
      if (!slug) return
      if (token !== null) {
        const current = serverQuery.data?.completed ?? []
        const next = current.includes(topic)
          ? current.filter((item) => item !== topic)
          : [...current, topic]
        mutation.mutate(next)
        return
      }
      setLocalState((previous) => {
        const current = previous[slug] ?? []
        const next = current.includes(topic)
          ? current.filter((item) => item !== topic)
          : [...current, topic]
        return { ...previous, [slug]: next }
      })
    },
    [slug, token, serverQuery.data, mutation],
  )

  return { completedTopics, toggleTopic }
}
