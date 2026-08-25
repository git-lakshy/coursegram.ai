import { useQuery } from "@tanstack/react-query"

import { getRoadmap, getRoadmapCategories, getRoadmapGraph, getRoadmapSlugs } from "@/lib/api"

export function useRoadmapSlugs() {
  return useQuery({
    queryKey: ["roadmap-slugs"],
    queryFn: getRoadmapSlugs,
  })
}

export function useRoadmap(slug: string | undefined) {
  return useQuery({
    queryKey: ["roadmap", slug],
    queryFn: () => getRoadmap(slug as string),
    enabled: Boolean(slug),
  })
}

export function useRoadmapGraph(slug: string | undefined) {
  return useQuery({
    queryKey: ["roadmap-graph", slug],
    queryFn: () => getRoadmapGraph(slug as string),
    enabled: Boolean(slug),
  })
}

export function useRoadmapCategories(slug: string | undefined) {
  return useQuery({
    queryKey: ["roadmap-categories", slug],
    queryFn: () => getRoadmapCategories(slug as string),
    staleTime: Infinity,
    enabled: Boolean(slug),
  })
}
