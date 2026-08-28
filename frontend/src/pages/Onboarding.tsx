import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Check, ChevronDown, ChevronRight, Flag, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import {
  ApiError,
  analyzeGoal,
  generatePlan,
  generateQuiz,
  getRoadmapSlugs,
  gradeQuiz,
  regenerateRoadmap,
  updateProfile,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import type { GoalAnalysisResponse, PlanPhase, QuizQuestion, SkillLevel } from "@/types"

const STEPS = ["Goal", "Areas", "Quiz", "Plan"] as const
const AREA_LEVELS = ["beginner", "intermediate", "expert"] as const

export function Onboarding() {
  const { token, email, profile, setProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const retake = (location.state as { retake?: boolean } | null)?.retake === true
  const retakeStarted = useRef(false)

  const [step, setStep] = useState(0)
  const [goalText, setGoalText] = useState("")
  const [extraDetails, setExtraDetails] = useState("")
  const [analysis, setAnalysis] = useState<GoalAnalysisResponse | null>(null)
  const [slug, setSlug] = useState<string>("")
  const [areaLevels, setAreaLevels] = useState<Record<string, string>>({})
  const [knownTopics, setKnownTopics] = useState<string[]>([])
  const [topicsOpen, setTopicsOpen] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ score: number; total: number; level: SkillLevel; summary: string } | null>(null)
  const [plan, setPlan] = useState<{ slug: string; summary: string; phases: PlanPhase[] } | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slugsQuery = useQuery({ queryKey: ["roadmap-slugs"], queryFn: getRoadmapSlugs })

  const goalMessage = extraDetails.trim() === "" ? goalText.trim() : `${goalText.trim()} ${extraDetails.trim()}`

  function errorMessage(err: unknown): string {
    if (err instanceof ApiError && err.message) {
      return err.message
    }
    return "Could not reach the AI service. Try again."
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
    setGoalText(profile.background)
    setKnownTopics(profile.known_topics)
    void (async () => {
      setIsBusy(true)
      setError(null)
      try {
        const quiz = await generateQuiz(token, retakeSlug, profile.known_topics, profile.skill_level)
        setQuestions(quiz.questions)
        setAnswers(quiz.questions.map(() => -1))
        setStep(2)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setIsBusy(false)
      }
    })()
  }, [])

  async function submitGoal() {
    if (token === null || goalText.trim() === "") return
    setIsBusy(true)
    setError(null)
    try {
      const analyzed = await analyzeGoal(token, goalMessage)
      setAnalysis(analyzed)
      setSlug(analyzed.track_slug)
      setAreaLevels(
        Object.fromEntries(analyzed.areas.map((area) => [area.name, "beginner"])),
      )
      setStep(1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  function toggleAreaLevel(areaName: string, level: string) {
    setAreaLevels((previous) => ({ ...previous, [areaName]: level }))
  }

  function toggleTopic(topic: string) {
    setKnownTopics((previous) =>
      previous.includes(topic) ? previous.filter((item) => item !== topic) : [...previous, topic],
    )
  }

  const lowestLevel = useMemo<SkillLevel>(() => {
    const levels = analysis?.areas.map((area) => areaLevels[area.name] ?? "beginner") ?? []
    if (levels.includes("beginner")) return "beginner"
    if (levels.includes("intermediate")) return "intermediate"
    return "advanced"
  }, [analysis, areaLevels])

  async function startQuiz() {
    if (token === null || slug === "") return
    setIsBusy(true)
    setError(null)
    try {
      const quiz = await generateQuiz(token, slug, knownTopics, lowestLevel)
      setQuestions(quiz.questions)
      setAnswers(quiz.questions.map(() => -1))
      setStep(2)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  async function buildPlan() {
    if (token === null) return
    setIsBusy(true)
    setError(null)
    try {
      const built = await generatePlan(token, slug, goalMessage, areaLevels, knownTopics)
      setPlan(built)
      setStep(3)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  async function finishQuiz() {
    if (token === null) return
    setIsBusy(true)
    setError(null)
    try {
      const graded = await gradeQuiz(token, questions, answers)
      setResult({ score: graded.score, total: graded.total, level: graded.recommended_level, summary: graded.summary })
      if (retake) {
        if (profile === null) throw new Error("Profile not loaded")
        const saved = await updateProfile(token, {
          display_name: profile.display_name,
          background: profile.background,
          skill_level: graded.recommended_level,
          plan: profile.plan,
          target_role_slug: profile.target_role_slug,
          known_topics: profile.known_topics,
          onboarding_complete: true,
          personalized_roadmap: profile.personalized_roadmap,
        })
        setProfile(saved)
        const regenerated = await regenerateRoadmap(token, slug)
        setPlan({
          slug: regenerated.slug,
          summary: regenerated.personalized_roadmap.summary,
          phases: regenerated.personalized_roadmap.phases,
        })
      } else {
        const built = await generatePlan(token, slug, goalMessage, areaLevels, knownTopics)
        setPlan(built)
      }
      setStep(3)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  function skipQuiz() {
    setResult(null)
    buildPlan()
  }

  async function startLearning() {
    if (token === null || plan === null) return
    if (retake) {
      toast.success("Your roadmap is ready")
      navigate("/roadmap", { replace: true })
      return
    }
    setIsBusy(true)
    try {
      const saved = await updateProfile(token, {
        display_name: profile?.display_name || email?.split("@")[0] || "",
        background: goalText.trim(),
        skill_level: result?.level ?? lowestLevel,
        plan: profile?.plan ?? "free",
        target_role_slug: plan.slug,
        known_topics: knownTopics,
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

  const canContinue = step === 0 ? goalText.trim() !== "" : true

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
            <p className="mb-3 mt-0.5 text-sm text-ink-secondary">
              Describe your goal in your own words and we will build a plan around it.
            </p>
            <textarea
              className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
              placeholder="I want to become a full stack developer"
              value={goalText}
              onChange={(event) => setGoalText(event.target.value)}
            />
            <Input
              className="mt-3"
              placeholder="Any extra details? Timeline, prior knowledge, constraints (optional)"
              value={extraDetails}
              onChange={(event) => setExtraDetails(event.target.value)}
            />
          </div>
        ) : null}

        {step === 1 && analysis !== null ? (
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">Here is what we found</h2>
            <p className="mb-3 mt-0.5 text-sm text-ink-secondary">{analysis.summary}</p>
            <Select
              className="w-full"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
            >
              {(slugsQuery.data?.slugs ?? []).includes(slug) ? null : <option value={slug}>{slug}</option>}
              {(slugsQuery.data?.slugs ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <div className="mt-4 space-y-2">
              {analysis.areas.map((area) => (
                <div key={area.name} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="text-sm font-medium text-ink-primary">{area.name}</span>
                  <div className="flex gap-1.5">
                    {AREA_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleAreaLevel(area.name, level)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
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
              className="mt-3 flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink-primary"
            >
              {topicsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Mark topics you already know ({knownTopics.length} selected)
            </button>
            {topicsOpen ? (
              <div className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                {analysis.areas.flatMap((area) => area.topics).map((topic) => {
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
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">Analysis quiz</h2>
            <p className="mb-3 mt-0.5 text-sm text-ink-secondary">
              {questions.length} questions on {slug} fundamentals. Skip any you are unsure about.
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

        {step === 3 && plan !== null ? (
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">Your personalized roadmap</h2>
            <p className="mb-3 mt-0.5 text-sm text-ink-secondary">{plan.summary}</p>
            {result !== null ? (
              <p className="mb-3 text-xs text-ink-muted">
                You scored {result.score} / {result.total}, recommended level: {result.level}
              </p>
            ) : null}
            <div className="space-y-2">
              {plan.phases.map((phase) => (
                <div key={phase.name} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-primary">{phase.name}</p>
                    <span className="flex items-center gap-1 rounded-full border border-accent-600 bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700">
                      <Flag className="h-3 w-3" />
                      {phase.milestone}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{phase.topics.join(", ")}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isBusy && step === 2 ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Building your personalized roadmap...
          </p>
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
          {step === 0 ? (
            <Button size="sm" variant="accent" onClick={submitGoal} disabled={!canContinue || isBusy}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Continue
            </Button>
          ) : null}
          {step === 1 ? (
            <Button size="sm" variant="accent" onClick={startQuiz} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Quick analysis
            </Button>
          ) : null}
            {step === 2 ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={skipQuiz} disabled={isBusy}>
                  Skip
                </Button>
                <Button size="sm" variant="accent" onClick={finishQuiz} disabled={isBusy}>
                  {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Finish quiz
                </Button>
              </div>
            ) : null}
          {step === 3 ? (
            <Button size="sm" variant="accent" onClick={startLearning} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Start learning
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
