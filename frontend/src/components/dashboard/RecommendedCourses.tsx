import { BookOpen } from "lucide-react"

import { CourseCard } from "@/components/courses/CourseCard"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { SectionHeader } from "@/components/common/SectionHeader"
import { Skeleton } from "@/components/ui/skeleton"
import type { Course } from "@/types"

type RecommendedCoursesProps = {
  courses: Course[]
  isLoading: boolean
  isError: boolean
  matchedTopic?: string
  onRetry: () => void
}

export function RecommendedCourses({ courses, isLoading, isError, matchedTopic, onRetry }: RecommendedCoursesProps) {
  return (
    <div>
      <SectionHeader title="Recommended for you" />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Could not load course recommendations." onRetry={onRetry} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No recommendations yet"
          description="Complete your next roadmap topic to unlock matching courses."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} matchedTopic={matchedTopic} />
          ))}
        </div>
      )}
    </div>
  )
}
