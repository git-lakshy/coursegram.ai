import { useQuery } from "@tanstack/react-query"

import { getStreak } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

export function useStreak() {
  const { token } = useAuth()
  const query = useQuery({
    queryKey: ["streak"],
    queryFn: () => getStreak(token!),
    enabled: token !== null,
    staleTime: 5 * 60 * 1000,
  })
  return {
    streakDays: query.data?.streak_days ?? 0,
    eventsThisMonth: query.data?.events_this_month ?? 0,
    isLoading: query.isLoading,
  }
}
