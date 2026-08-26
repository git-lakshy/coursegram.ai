import { useQuery } from "@tanstack/react-query"

import { useAuth } from "@/hooks/useAuth"
import { getNextWithResources, getResources } from "@/lib/api"

export type ResourcesOptions = {
  free?: boolean
  types?: string[]
  limit?: number
}

export function useResources(topics: string[], level: string, options: ResourcesOptions = {}) {
  return useQuery({
    queryKey: ["resources", topics.join(","), level, options],
    queryFn: () => getResources(topics, level, options),
    enabled: topics.length > 0 && level !== "",
  })
}

export function useNextWithResources(slug: string | undefined, enabled = true) {
  const { token } = useAuth()
  return useQuery({
    queryKey: ["next-with-resources", slug, token],
    queryFn: () => getNextWithResources(token as string, slug as string),
    enabled: Boolean(token) && Boolean(slug) && enabled,
  })
}
