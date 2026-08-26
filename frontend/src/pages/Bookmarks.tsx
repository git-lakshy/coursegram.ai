import { Bookmark } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { ResourceCard } from "@/components/resources/ResourceCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useBookmarks } from "@/hooks/useBookmarks"

export function Bookmarks() {
  const bookmarksQuery = useBookmarks()
  const bookmarks = bookmarksQuery.bookmarks

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">Bookmarks</h1>
        <p className="text-sm text-ink-secondary">Courses and topics you saved for later.</p>
      </div>

      {bookmarksQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
      ) : bookmarksQuery.isError ? (
        <ErrorState
          message="Could not load your bookmarks."
          onRetry={() => void bookmarksQuery.refetch()}
        />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Save resources from your roadmap to find them here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              saved
              onToggleSave={bookmarksQuery.toggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  )
}
