import { BookOpen, X } from "lucide-react"
import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { useLearning } from "@/hooks/useLearning"

export function CurrentlyLearningPanel() {
  const { courses, isLoading, isError, refetch, setStatus, remove } = useLearning()

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Currently learning
        </p>
        {courses.length > 0 ? (
          <Link to="/courses" className="text-xs font-medium text-accent-700 hover:underline">
            Find courses
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-ink-muted">
          Could not load your courses.
          <button type="button" onClick={() => refetch()} className="ml-1 font-medium underline hover:text-ink-primary">
            Retry
          </button>
        </p>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-md border border-dashed border-border px-4 py-5 text-center">
          <BookOpen className="h-4 w-4 text-ink-muted" />
          <p className="text-xs text-ink-secondary">Nothing tracked yet.</p>
          <Link to="/courses" className="text-xs font-medium text-accent-700 hover:underline">
            Find courses
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={course.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium text-ink-primary hover:text-accent-700"
                >
                  {course.name}
                </a>
                <p className="truncate text-xs text-ink-muted">
                  {course.provider}
                  {course.status === "completed" ? " · Completed" : " · Learning"}
                </p>
              </div>
              {course.status === "learning" ? (
                <button
                  type="button"
                  onClick={() => void setStatus(course.id, "completed")}
                  className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-secondary transition-colors hover:border-accent-600 hover:text-accent-700"
                >
                  Mark completed
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void setStatus(course.id, "learning")}
                  className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-secondary transition-colors hover:border-accent-600 hover:text-accent-700"
                >
                  Learn again
                </button>
              )}
              <button
                type="button"
                aria-label="Stop tracking this course"
                onClick={() => void remove(course.id)}
                className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:bg-surface hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
