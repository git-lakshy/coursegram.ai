import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowDown, Check, ChevronDown, ChevronRight, GraduationCap, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { MarkdownContent } from "@/components/common/MarkdownContent"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import {
  ApiError,
  analyzeGoal,
  generatePlan,
  generateQuiz,
  getRoadmapSlugs,
  gradeQuiz,
  updateProfile,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import type { GoalAnalysisResponse, PlanPhase, QuizQuestion, SkillLevel } from "@/types"

const STEPS = ["Goal", "Areas", "Quiz", "Plan"] as const
const AREA_LEVELS = ["beginner", "intermediate", "expert"] as const

type ThreadItem = { id: number; role: "guide" | "user"; text: string }

function GuideBubble({ item }: { item: ThreadItem }) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[88%] gap-2">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700">
          <GraduationCap className="h-3.5 w-3.5" />
        </div>
        <div className="rounded-2xl rounded-tl-md border border-border bg-surface px-3.5 py-2 text-sm leading-relaxed text-ink-primary">
          <MarkdownContent content={item.text} />
        </div>
      </div>
    </div>
  )
}

function UserBubble({ item }: { item: ThreadItem }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent-600 px-3.5 py-2 text-sm text-surface">
        {item.text}
      </div>
    </div>
  )
}

export function Onboarding() {
  const { token, email, profile, setProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const retake = (location.state as { retake?: boolean } | null)?.retake === true
  const retakeStarted = useRef(false)

  const [step, setStep] = useState(0)
  const [thread, setThread] = useState<ThreadItem[]>([])
  const threadId = useRef(0)
  const [goalText, setGoalText] = useState("")
  const [analysis, setAnalysis] = useState<GoalAnalysisResponse | null>(null)
  const [slug, setSlug] = useState<string>("")
  const [areaLevels, setAreaLevels] = useState<Record<string, string>>({})
  const [knownTopics, setKnownTopics] = useState<string[]>([])
  const [topicsOpen, setTopicsOpen] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ score: number; total: number; level: SkillLevel } | null>(null)
  const [plan, setPlan] = useState<{ slug: string; summary: string; phases: PlanPhase[] } | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [justSent, setJustSent] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const slugsQuery = useQuery({ queryKey: ["roadmap-slugs"], queryFn: getRoadmapSlugs })

  function push(role: "guide" | "user", text: string) {
    threadId.current += 1
    setThread((previous) => [...previous, { id: threadId.current, role, text }])
  }

  useEffect(() => {
    if (isNearBottom || justSent) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      setJustSent(false)
    }
  }, [thread, isBusy, isNearBottom, justSent])

  function handleScroll() {
    const container = scrollRef.current
    if (container === null) return
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight
    setIsNearBottom(distance < 120)
  }

  function scrollToBottom() {
    setJustSent(true)
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (thread.length > 0) return
    push(
      "guide",
      "Let us shape your learning path. What do you want to learn or become? Describe your goal in your own words, and mention any experience you already have.",
    )
  }, [thread.length])

  function errorMessage(err: unknown): string {
    if (err instanceof ApiError && err.message) {
      return err.message
    }
    return "Could not reach the AI service. Try again."
  }

  async function submitGoal() {
    const trimmed = goalText.trim()
    if (token === null || trimmed === "" || isBusy) return
    setIsBusy(true)
    setError(null)
    setJustSent(true)
    push("user", trimmed)
    setGoalText("")
    try {
      const analyzed = await analyzeGoal(token, trimmed)
      setAnalysis(analyzed)
      setSlug(analyzed.track_slug)
      setAreaLevels(
        Object.fromEntries(analyzed.areas.map((area) => [area.name, "beginner"])),
      )
      push(
        "guide",
        `${analyzed.summary} I matched you to the **${analyzed.track_slug}** track. Confirm the track below, set your level for each area, and mark anything you already know.`,
      )
      setStep(1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsBusy(false)
      inputRef.current?.focus()
    }
  }

  async function confirmAreas() {
    if (token === null || slug === "" || isBusy) return
    setIsBusy(true)
    setError(null)
    try {
      const quiz = await generateQuiz(token, slug, knownTopics, lowestLevel)
      setQuestions(quiz.questions)
      setAnswers(quiz.questions.map(() => -1))
      push(
        "guide",
        `Before building the plan, a quick calibration: ${quiz.questions.length} questions on ${slug} fundamentals. Answer what you can and skip the rest, or skip the whole quiz.`,
      )
      setStep(2)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  async function buildPlan(graded: { score: number; total: number; level: SkillLevel } | null) {
    if (token === null || slug === "") return
    const built = await generatePlan(token, slug, analysis?.summary ?? slug, areaLevels, knownTopics, profile?.weekly_hours)
    setPlan(built)
    if (graded !== null) {
      push(
        "guide",
        `You scored ${graded.score} out of ${graded.total}, so I calibrated the plan to **${graded.level}** level. Here is your roadmap for ${built.slug}.`,
      )
    } else {
      push("guide", `Here is your roadmap for ${built.slug}.`)
    }
    setStep(3)
  }

  async function finishQuiz() {
    if (token === null || isBusy) return
    setIsBusy(true)
    setError(null)
    try {
      const graded = await gradeQuiz(token, questions, answers)
      const calibrated = { score: graded.score, total: graded.total, level: graded.recommended_level }
      setResult(calibrated)
      await buildPlan(calibrated)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  async function skipQuiz() {
    if (token === null || isBusy) return
    setIsBusy(true)
    setError(null)
    try {
      push("guide", "No problem, skipping the quiz.")
      await buildPlan(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  async function startLearning() {
    if (token === null || plan === null || isBusy) return
    setIsBusy(true)
    try {
      const saved = await updateProfile(token, {
        display_name: profile?.display_name || email?.split("@")[0] || "",
        background: analysis?.summary || slug,
        skill_level: result?.level ?? lowestLevel,
        plan: profile?.plan ?? "free",
        target_role_slug: plan.slug,
        known_topics: knownTopics,
        interests: profile?.interests ?? [],
        weekly_hours: profile?.weekly_hours ?? null,
        preferred_formats: profile?.preferred_formats ?? [],
        onboarding_complete: true,
        personalized_roadmap: {
          slug: plan.slug,
          summary: plan.summary,
          phases: plan.phases,
          created_at: new Date().toISOString(),
        },
      })
      setProfile(saved)
      toast.success("Your roadmap is ready")
      navigate("/roadmap", { replace: true })
    } catch {
      toast.error("Could not save your profile. Try again.")
    } finally {
      setIsBusy(false)
    }
  }

  useEffect(() => {
    if (!retake || retakeStarted.current) return
    retakeStarted.current = true
    const retakeSlug = profile?.target_role_slug
    if (token === null || profile === null || retakeSlug === null || retakeSlug === undefined) {
      toast.error("No target track to reassess yet")
      return
    }
    setSlug(retakeSlug)
    setKnownTopics(profile.known_topics)
    void (async () => {
      setIsBusy(true)
      setError(null)
      try {
        const quiz = await generateQuiz(token, retakeSlug, profile.known_topics, profile.skill_level)
        setQuestions(quiz.questions)
        setAnswers(quiz.questions.map(() => -1))
        push(
          "guide",
          `Retaking the calibration quiz for **${retakeSlug}**: ${quiz.questions.length} questions. Answer what you can, or skip.`,
        )
        setStep(2)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setIsBusy(false)
      }
    })()
  }, [])

  const lowestLevel = useMemo<SkillLevel>(() => {
    const levels = analysis?.areas.map((area) => areaLevels[area.name] ?? "beginner") ?? []
    if (levels.includes("beginner")) return "beginner"
    if (levels.includes("intermediate")) return "intermediate"
    return "advanced"
  }, [analysis, areaLevels])

  function toggleAreaLevel(areaName: string, level: string) {
    setAreaLevels((previous) => ({ ...previous, [areaName]: level }))
  }

  function toggleTopic(topic: string) {
    setKnownTopics((previous) =>
      previous.includes(topic) ? previous.filter((item) => item !== topic) : [...previous, topic],
    )
  }

  return (
    <div className="relative mx-auto flex h-full max-w-3xl flex-col px-4 pt-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink-primary">Getting started</h1>
          <p className="text-sm text-ink-secondary">A short conversation, and your path is ready.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                index === step ? "bg-accent-600 text-white" : index < step ? "bg-accent-50 text-accent-700" : "bg-background text-ink-muted border border-border",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="scroll-slim relative min-h-0 flex-1 space-y-3 overflow-y-auto pb-4"
      >
        {thread.map((item) =>
          item.role === "guide" ? <GuideBubble key={item.id} item={item} /> : <UserBubble key={item.id} item={item} />,
        )}

        {isBusy ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-surface px-3.5 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-muted" />
              <span className="text-xs text-ink-muted">Thinking...</span>
            </div>
          </div>
        ) : null}

        {error !== null ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : null}

        {step === 1 && analysis !== null && !isBusy ? (
          <div className="ml-8 max-w-[88%] space-y-3 rounded-2xl rounded-tl-md border border-border bg-surface p-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-secondary">Track</span>
              <Select className="w-full" value={slug} onChange={(event) => setSlug(event.target.value)}>
                {(slugsQuery.data?.slugs ?? []).includes(slug) ? null : <option value={slug}>{slug}</option>}
                {(slugsQuery.data?.slugs ?? []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </label>
            <div className="space-y-2">
              {analysis.areas.map((area) => (
                <div key={area.name} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5">
                  <span className="truncate text-sm font-medium text-ink-primary">{area.name}</span>
                  <div className="flex shrink-0 gap-1">
                    {AREA_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleAreaLevel(area.name, level)}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize transition-colors",
                          areaLevels[area.name] === level
                            ? "border-accent-600 bg-accent-50 text-accent-700"
                            : "border-border bg-surface text-ink-secondary hover:border-ink-muted",
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTopicsOpen((previous) => !previous)}
              className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink-primary"
            >
              {topicsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Mark topics you already know ({knownTopics.length} selected)
            </button>
            {topicsOpen ? (
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto scroll-slim">
                {analysis.areas.flatMap((area) => area.topics).map((topic) => {
                  const selected = knownTopics.includes(topic)
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                        selected
                          ? "border-accent-600 bg-accent-50 text-accent-700"
                          : "border-border bg-surface text-ink-secondary hover:border-ink-muted",
                      )}
                    >
                      {selected ? <Check className="h-2.5 w-2.5" /> : null}
                      {topic}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <Button variant="accent" size="sm" onClick={confirmAreas} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Looks right
            </Button>
          </div>
        ) : null}

        {step === 2 && questions.length > 0 && !isBusy ? (
          <div className="ml-8 max-w-[88%] space-y-3 rounded-2xl rounded-tl-md border border-border bg-surface p-3">
            {questions.map((question, questionIndex) => (
              <div key={question.id} className="rounded-md border border-border p-2.5">
                <p className="text-sm font-medium text-ink-primary">
                  {questionIndex + 1}. {question.question}
                </p>
                <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <button
                      key={optionIndex}
                      type="button"
                      onClick={() =>
                        setAnswers((previous) =>
                          previous.map((value, index) => (index === questionIndex ? optionIndex : value)),
                        )
                      }
                      className={cn(
                        "rounded-md border px-2 py-1 text-left text-xs transition-colors",
                        answers[questionIndex] === optionIndex
                          ? "border-accent-600 bg-accent-50 text-accent-700"
                          : "border-border text-ink-secondary hover:bg-background",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={skipQuiz} disabled={isBusy}>
                Skip quiz
              </Button>
              <Button variant="accent" size="sm" onClick={finishQuiz} disabled={isBusy}>
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Finish quiz
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 && plan !== null && !isBusy ? (
          <div className="ml-8 max-w-[88%] space-y-2 rounded-2xl rounded-tl-md border border-accent-600 bg-accent-50/40 p-3">
            <p className="text-xs leading-relaxed text-ink-primary">{plan.summary}</p>
            {plan.phases.map((phase, index) => (
              <div key={phase.name} className="rounded-md border border-border bg-surface p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-primary">
                    {index + 1}. {phase.name}
                  </p>
                  <span className="flex items-center gap-1 rounded-full border border-accent-600 bg-accent-50 px-1.5 py-0.5 text-[10px] font-medium text-accent-700">
                    {phase.milestone}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{phase.topics.join(", ")}</p>
              </div>
            ))}
            <Button variant="accent" size="sm" onClick={startLearning} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Start learning
            </Button>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {!isNearBottom && thread.length > 0 ? (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Jump to latest message"
          className="absolute bottom-24 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink-secondary shadow-sm transition-colors hover:border-accent-600 hover:text-accent-700"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      ) : null}

      <div className="sticky bottom-0 bg-background pb-4 pt-1">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submitGoal()
          }}
          className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm focus-within:border-accent-500"
        >
          <textarea
            ref={inputRef}
            value={goalText}
            onChange={(event) => setGoalText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                submitGoal()
              }
            }}
            placeholder={step === 0 ? "I want to become a full stack developer..." : "The conversation continues above"}
            rows={1}
            disabled={step !== 0 || isBusy}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:outline-none disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            variant="accent"
            className="h-8 w-8 shrink-0 rounded-xl"
            disabled={isBusy || step !== 0 || goalText.trim() === ""}
            aria-label="Send goal"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send
          </Button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-ink-muted">
          Interests and study pace can be added later on your profile to sharpen recommendations.
        </p>
      </div>
    </div>
  )
}
