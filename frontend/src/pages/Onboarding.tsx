import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { ApiError, generateQuiz, gradeQuiz, getRoadmapGraph, getRoadmapSlugs, updateProfile } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { QuizQuestion, SkillLevel } from "@/types"

const STEPS = ["Track", "Known skills", "Level", "Quiz", "Done"] as const
const SKILL_LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced"]

export function Onboarding() {
  const { token, email, profile, setProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [slug, setSlug] = useState<string>("")
  const [knownTopics, setKnownTopics] = useState<string[]>([])
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("beginner")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ score: number; total: number; level: SkillLevel; summary: string } | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slugsQuery = useQuery({ queryKey: ["roadmap-slugs"], queryFn: getRoadmapSlugs })
  const graphQuery = useQuery({
    queryKey: ["roadmap-graph", slug],
    queryFn: () => getRoadmapGraph(slug),
    enabled: slug !== "",
  })
  const topics = useMemo(() => graphQuery.data?.nodes.map((node) => node.name) ?? [], [graphQuery.data])

  const effectiveSlug = slug || profile?.target_role_slug || ""

  function toggleTopic(topic: string) {
    setKnownTopics((previous) =>
      previous.includes(topic) ? previous.filter((item) => item !== topic) : [...previous, topic],
    )
  }

  async function startQuiz() {
    if (token === null) return
    setIsBusy(true)
    setError(null)
    try {
      const quiz = await generateQuiz(token, effectiveSlug, knownTopics, skillLevel)
      setQuestions(quiz.questions)
      setAnswers(quiz.questions.map(() => -1))
      setStep(3)
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      setError(
        status === 503
          ? "The AI quiz needs an LLM key on the server. Skipping the quiz, you can set your level manually in Profile."
          : "Could not generate the quiz. Try again.",
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function finishQuiz() {
    if (token === null) return
    setIsBusy(true)
    try {
      const graded = await gradeQuiz(token, questions, answers)
      setResult({ score: graded.score, total: graded.total, level: graded.recommended_level, summary: graded.summary })
      setStep(4)
    } catch {
      setError("Could not grade the quiz. Try again.")
    } finally {
      setIsBusy(false)
    }
  }

  async function saveAndFinish() {
    if (token === null) return
    setIsBusy(true)
    try {
      const finalLevel = result?.level ?? skillLevel
      const saved = await updateProfile(token, {
        display_name: profile?.display_name || email?.split("@")[0] || "",
        background: profile?.background || "",
        skill_level: finalLevel,
        target_role_slug: effectiveSlug,
        known_topics: knownTopics,
        onboarding_complete: true,
      })
      setProfile(saved)
      toast.success("You are all set")
      navigate("/roadmap", { replace: true })
    } catch {
      toast.error("Could not save your profile. Try again.")
    } finally {
      setIsBusy(false)
    }
  }

  const canNext = step === 0 ? effectiveSlug !== "" : true

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent-700">Getting started</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink-primary">
          Let us shape your learning path
        </h1>
        <div className="mt-3 flex items-center gap-1.5">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 flex-col gap-1">
              <div className={cn("h-1 rounded-full", index <= step ? "bg-accent-600" : "bg-border")} />
              <span className={cn("text-[10px] font-medium", index === step ? "text-ink-primary" : "text-ink-muted")}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Card className="p-5">
        {step === 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">What do you want to learn?</h2>
            <p className="mb-3 mt-0.5 text-sm text-ink-secondary">Pick the track you are aiming for.</p>
            <Select
              className="w-full"
              value={effectiveSlug}
              onChange={(event) => {
                setSlug(event.target.value)
                setKnownTopics([])
              }}
            >
              <option value="">Choose a track</option>
              {(slugsQuery.data?.slugs ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">What do you already know?</h2>
            <p className="mb-3 mt-0.5 text-sm text-ink-secondary">
              Select topics from the {effectiveSlug} track you are comfortable with.
            </p>
            {graphQuery.isLoading ? (
              <p className="text-sm text-ink-muted">Loading topics...</p>
            ) : topics.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No topic list available for this track. You can continue without selecting any.
              </p>
            ) : (
              <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
                {topics.map((topic) => {
                  const selected = knownTopics.includes(topic)
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        selected
                          ? "border-accent-600 bg-accent-50 text-accent-700"
                          : "border-border bg-surface text-ink-secondary hover:border-ink-muted",
                      )}
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                      {topic}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="mt-2 text-xs text-ink-muted">{knownTopics.length} selected</p>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">How would you rate yourself?</h2>
            <p className="mb-3 mt-0.5 text-sm text-ink-secondary">
              A short quiz next will fine tune this, or skip it if you prefer.
            </p>
            <div className="grid gap-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSkillLevel(level)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    skillLevel === level
                      ? "border-accent-600 bg-accent-50 text-accent-700"
                      : "border-border bg-surface text-ink-primary hover:bg-background",
                  )}
                >
                  <span className="font-medium capitalize">{level}</span>
                  {skillLevel === level ? <Check className="h-4 w-4" /> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">Placement quiz</h2>
            <p className="mb-3 mt-0.5 text-sm text-ink-secondary">
              {questions.length} questions on {effectiveSlug} fundamentals. Skip any you are unsure about.
            </p>
            <div className="space-y-4">
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
            </div>
          </div>
        ) : null}

        {step === 4 && result !== null ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-700">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="text-sm font-semibold text-ink-primary">
              You scored {result.score} / {result.total}
            </h2>
            <p className="mt-1 text-sm capitalize text-ink-secondary">Recommended level: {result.level}</p>
            <p className="mx-auto mt-2 max-w-sm text-xs text-ink-muted">{result.summary}</p>
          </div>
        ) : null}

        {error !== null ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

        <div className="mt-5 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((previous) => Math.max(0, previous - 1))}
            disabled={step === 0 || isBusy}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          {step < 2 ? (
            <Button size="sm" variant="accent" onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {step === 2 ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={saveAndFinish} disabled={isBusy}>
                Skip quiz
              </Button>
              <Button size="sm" variant="accent" onClick={startQuiz} disabled={isBusy}>
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                Start quiz
              </Button>
            </div>
          ) : null}
          {step === 3 ? (
            <Button size="sm" variant="accent" onClick={finishQuiz} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Finish quiz
            </Button>
          ) : null}
          {step === 4 ? (
            <Button size="sm" variant="accent" onClick={saveAndFinish} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Show my roadmap
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
