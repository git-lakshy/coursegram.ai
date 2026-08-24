import { useCallback, useEffect, useState } from "react"

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
 * The backend does not track learner progress. Completion state is kept in
 * the browser only, per roadmap slug, until a real progress endpoint exists.
 */
export function useLocalProgress(slug: string | undefined) {
  const [state, setState] = useState<ProgressState>(() => readStoredProgress())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const completedTopics = slug ? state[slug] ?? [] : []

  const toggleTopic = useCallback(
    (topic: string) => {
      if (!slug) return
      setState((previous) => {
        const current = previous[slug] ?? []
        const next = current.includes(topic)
          ? current.filter((item) => item !== topic)
          : [...current, topic]
        return { ...previous, [slug]: next }
      })
    },
    [slug],
  )

  return { completedTopics, toggleTopic }
}
