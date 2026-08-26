import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { addBookmark, removeBookmark, listBookmarks } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

export function useBookmarks() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const bookmarksQuery = useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => listBookmarks(token!),
    enabled: token !== null,
  })

  const mutation = useMutation({
    mutationFn: async ({ resourceId, bookmarked }: { resourceId: string; bookmarked: boolean }) =>
      bookmarked ? addBookmark(token!, resourceId) : removeBookmark(token!, resourceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] })
    },
  })

  const bookmarks = bookmarksQuery.data?.resources ?? []
  const bookmarkedIds = new Set(bookmarks.map((resource) => resource.id))

  const toggleBookmark = useCallback(
    (resourceId: string) => {
      mutation.mutate({ resourceId, bookmarked: !bookmarkedIds.has(resourceId) })
    },
    [mutation, bookmarkedIds],
  )

  return {
    bookmarks,
    bookmarkedIds,
    isLoading: bookmarksQuery.isLoading,
    isError: bookmarksQuery.isError,
    refetch: bookmarksQuery.refetch,
    toggleBookmark,
  }
}
