import { BookOpen, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Course } from "@/types"

export function CourseCard({ course, matchedTopic }: { course: Course; matchedTopic?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-ink-secondary">
          <BookOpen className="h-3.5 w-3.5" />
        </div>
        <p className="text-sm font-medium leading-snug text-ink-primary">{course.name ?? "Untitled course"}</p>
      </div>

      {matchedTopic ? (
        <p className="text-xs text-ink-secondary">
          Matched to <span className="font-medium text-ink-primary">{matchedTopic}</span>
        </p>
      ) : null}

      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-ink-muted">Coursera</span>
        <Button variant="outline" size="sm" asChild>
          <a href={course.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
            Open
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
    </div>
  )
}
