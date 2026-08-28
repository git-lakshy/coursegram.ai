import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, ClipboardCheck, Loader2, Lock, RotateCcw, XCircle } from "lucide-react"
import { toast } from "sonner"

import { ErrorState } from "@/components/common/ErrorState"
import { ResourceCard } from "@/components/resources/ResourceCard"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useLearning } from "@/hooks/useLearning"
import { useRoadmapSlugs } from "@/hooks/useRoadmaps"
import {
  generateStageAssessment,
  getAssessmentStages,
  submitStageAssessment,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import type { AssessmentStage, AssessmentSubmitResponse, QuizQuestion } from "@/types"

function StageRow({
  stage,
  onStart,
  isGenerating,
  active,
}: {
  stage: AssessmentStage
  onStart: () => void
  isGenerating: boolean
  active: boolean
}) {
  const result = stage.latest_result
  const statusLabel = !stage.assessable
    ? "Locked"
    : result
      ? result.passed
        ? `Passed ${result.score}/${result.total}`
        : `Failed ${result.score}/${result.total}`
    : stage.completed_count === stage.topics.length && stage.topics.length > 0
      ? "Ready"
      : "Ongoing"

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5",
        active ? "border-accent-600 bg-accent-50/40" : "border-border bg-background",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-ink-secondary">
          {!stage.assessable ? (
            <Lock className="h-4 w-4" />
          ) : result ? (
            result.passed ? (
              <CheckCircle2 className="h-4 w-4 text-accent-700" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )
          ) : (
            <ClipboardCheck className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-primary">{stage.name}</p>
          <p className="truncate text-xs text-ink-muted">
            {stage.completed_count} / {stage.topics.length} topics
            {stage.milestone ? ` · ${stage.milestone}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            !stage.assessable
              ? "bg-background text-ink-muted"
              : result && !result.passed
                ? "bg-red-50 text-red-700"
                : result
                  ? "bg-accent-50 text-accent-700"
                  : "bg-blue-50 text-blue-700"
          }`}
        >
          {statusLabel}
        </span>
        {stage.assessable ? (
          <Button variant="outline" size="sm" onClick={onStart} disabled={isGenerating}>
            {isGenerating ? "Preparing..." : result ? "Retake" : "Start"}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function ActiveAssessment({
  stage,
  questions,
  slug,
  onDone,
}: {
  stage: AssessmentStage
  questions: QuizQuestion[]
  slug: string
  onDone: () => void
}) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const { statusMap: learningStatus, setStatus: setTrackStatus } = useLearning()
  const [answers, setAnswers] = useState<number[]>(questions.map(() => -1))
  const [result, setResult] = useState<AssessmentSubmitResponse | null>(null)

  const submitMutation = useMutation({
    mutationFn: () =>
      submitStageAssessment(
        token!,
        slug,
        stage.position,
        questions.map((question, index) => ({
          question_id: question.id,
          answer_index: answers[index],
        })),
      ),
    onSuccess: async (data) => {
      setResult(data)
      await queryClient.invalidateQueries({ queryKey: ["assessment-stages", slug] })
      await queryClient.invalidateQueries({ queryKey: ["progress", slug] })
      await queryClient.invalidateQueries({ queryKey: ["next-with-resources", slug] })
      toast.success(data.passed ? "Assessment passed" : "Below the passing bar")
    },
    onError: () => {
      toast.error("Could not submit the assessment")
    },
  })

  if (result !== null) {
    return (
      <div className="space-y-3 rounded-md border border-border bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink-primary">
            {result.stage}: {result.score} / {result.total}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              result.passed ? "bg-accent-50 text-accent-700" : "bg-red-50 text-red-700"
            }`}
          >
            {result.passed ? "Passed" : "Needs review"}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-ink-secondary">{result.summary}</p>
        {result.revisit_topics.length > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-2 text-xs text-amber-800">
            Marked for revisiting: {result.revisit_topics.join(", ")}. The roadmap moved these back into your queue.
          </p>
        ) : null}
        {result.resources.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Resources for the weak topics
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  trackStatus={learningStatus.get(resource.id)}
                  onSetStatus={token !== null ? (id, status) => void setTrackStatus(id, status) : undefined}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResult(null)
              setAnswers(questions.map(() => -1))
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retake now
          </Button>
          <Button variant="accent" size="sm" onClick={onDone}>
            Back to stages
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-md border border-accent-600 bg-surface p-3">
      <p className="text-xs text-ink-secondary">
        {questions.length} questions on {stage.name}. Score below 50% and the stage topics you completed move back
        into your roadmap for revisiting.
      </p>
      {questions.map((question, questionIndex) => (
        <div key={question.id} className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-ink-primary">
            {questionIndex + 1}. {question.question}
          </p>
          <div className="mt-2 space-y-1.5">
            {question.options.map((option, optionIndex) => (
              <label
                key={optionIndex}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                  answers[questionIndex] === optionIndex
                    ? "border-accent-600 bg-accent-50 text-accent-700"
                    : "border-border text-ink-secondary hover:bg-background",
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  className="accent-accent-600"
                  checked={answers[questionIndex] === optionIndex}
                  onChange={() =>
                    setAnswers((previous) =>
                      previous.map((value, index) => (index === questionIndex ? optionIndex : value)),
                    )
                  }
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={submitMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="accent"
          size="sm"
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || answers.every((answer) => answer === -1)}
        >
          {submitMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Submit
        </Button>
      </div>
    </div>
  )
}

export function Assessments() {
  const { profile, token } = useAuth()
  const slugsQuery = useRoadmapSlugs()
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined)
  const slug = selectedSlug ?? profile?.target_role_slug ?? undefined

  const stagesQuery = useQuery({
    queryKey: ["assessment-stages", slug, token],
    queryFn: () => getAssessmentStages(token!, slug!),
    enabled: token !== null && slug !== undefined && slug !== "",
  })

  const [activeStage, setActiveStage] = useState<AssessmentStage | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])

  const generateMutation = useMutation({
    mutationFn: (stage: AssessmentStage) => generateStageAssessment(token!, slug!, stage.position),
    onSuccess: (data, stage) => {
      setQuestions(data.questions)
      setActiveStage(stage)
    },
    onError: () => {
      toast.error("Could not prepare this assessment")
    },
  })

  if (token === null) {
    return null
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-primary">Assessments</h1>
          <p className="text-sm text-ink-secondary">
            Stage checks for the topics you have completed or are working on. Failing scores move topics back into
            your roadmap.
          </p>
        </div>
        {slugsQuery.data && slugsQuery.data.slugs.length > 0 ? (
          <Select
            value={slug ?? ""}
            onChange={(event) => {
              setSelectedSlug(event.target.value)
              setActiveStage(null)
            }}
            className="w-44 shrink-0"
          >
            {slug === undefined || slug === "" ? <option value="">Select a track</option> : null}
            {slugsQuery.data.slugs.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {slug === undefined || slug === "" ? (
        <p className="text-sm text-ink-muted">Pick a track to see its stage checks.</p>
      ) : stagesQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-12 w-full" />
          ))}
        </div>
      ) : stagesQuery.isError ? (
        <ErrorState message="Could not load your stages." onRetry={() => stagesQuery.refetch()} />
      ) : activeStage !== null ? (
        <ActiveAssessment
          stage={activeStage}
          questions={questions}
          slug={slug}
          onDone={() => setActiveStage(null)}
        />
      ) : (
        <div className="space-y-2">
          {stagesQuery.data?.stages.map((stage) => (
            <StageRow
              key={stage.position}
              stage={stage}
              active={false}
              isGenerating={generateMutation.isPending && generateMutation.variables?.position === stage.position}
              onStart={() => generateMutation.mutate(stage)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
