import { Bookmark } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"

export function Bookmarks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">Bookmarks</h1>
        <p className="text-sm text-ink-secondary">Courses and topics you saved for later.</p>
      </div>
      <EmptyState
        icon={Bookmark}
        title="No bookmarks yet"
        description="Save a course from the Courses page to see it here."
      />
    </div>
  )
}
