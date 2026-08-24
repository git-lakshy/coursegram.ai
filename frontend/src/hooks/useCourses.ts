import { useQuery } from "@tanstack/react-query"

import { getCourses } from "@/lib/api"

export function useCourses(topic: string, limit = 20) {
  return useQuery({
    queryKey: ["courses", topic, limit],
    queryFn: () => getCourses(topic, limit),
  })
}
