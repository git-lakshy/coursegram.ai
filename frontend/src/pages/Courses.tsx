import { useState } from "react"
import { BookOpen } from "lucide-react"

import { CourseCard } from "@/components/courses/CourseCard"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useCourses } from "@/hooks/useCourses"

export function Courses() {
  const [topic, setTopic] = useState("python")
  const [draftTopic, setDraftTopic] = useState("python")
  const coursesQuery = useCourses(topic, 20)

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">Courses</h1>
        <p className="text-sm text-ink-secondary">Search Coursera courses by topic keyword.</p>
      </div>

      <form
        className="mb-4 flex max-w-sm gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setTopic(draftTopic.trim())
        }}
      >
        <Input
          value={draftTopic}
          onChange={(event) => setDraftTopic(event.target.value)}
          placeholder="Search by topic, e.g. python"
        />
      </form>

      {coursesQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
      ) : coursesQuery.isError ? (
        <ErrorState message="Could not load courses for this topic." onRetry={() => coursesQuery.refetch()} />
      ) : (coursesQuery.data?.courses.length ?? 0) === 0 ? (
        <EmptyState icon={BookOpen} title="No courses found" description="Try a different topic keyword." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coursesQuery.data?.courses.map((course) => (
            <CourseCard key={course.id ?? course.url} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}
