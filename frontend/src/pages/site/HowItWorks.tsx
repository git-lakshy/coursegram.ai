import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

import { SiteFooter, SiteNav } from "@/components/site/SitePage"

const STEPS = [
  {
    step: "1",
    title: "Describe your goal in natural language",
    detail:
      "Start by telling Coursegram what you want to become, the way you would tell a mentor. I want to become a machine learning engineer in eight months and I already know Python basics. No forms, no dropdowns, no rigid templates. Your own words are enough for the AI to understand your ambition, your timeline, and where you are starting from.",
  },
  {
    step: "2",
    title: "AI analyzes and quizzes your proficiency",
    detail:
      "Coursegram breaks your goal into its underlying skill areas, then checks what you actually know with a short adaptive proficiency quiz. You are not graded, you are mapped. The result is a precise picture of your strengths and gaps across every skill that matters for your target role.",
  },
  {
    step: "3",
    title: "Get a personalized roadmap with milestones",
    detail:
      "Using your goal and your skill map, Coursegram generates a phased roadmap with clear milestones: foundations first, then core skills, then specialization and portfolio work. Each phase lists concrete topics, curated courses from Coursera, projects to build, and assessments to prove mastery before you move on.",
  },
  {
    step: "4",
    title: "Learn and track progress as the path adapts",
    detail:
      "Work through your roadmap one milestone at a time, checking off topics as you complete them. Every completed assessment updates your skill profile, and if you speed ahead or life gets busy, the AI regenerates the remaining path to fit reality. The plan bends around you instead of breaking.",
  },
]

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-6 py-14">
        <h1 className="max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink-primary md:text-5xl">
          From vague ambition to a clear plan in four steps
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          Getting started on a new career skill is usually the hardest part. Which course? In which
          order? For how long? Coursegram replaces weeks of planning with a short conversation and an
          intelligent quiz. Here is exactly what happens after you sign up.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {STEPS.map((item) => (
            <div key={item.step} className="rounded-xl border border-border bg-surface p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-50 text-sm font-semibold text-accent-700">
                {item.step}
              </span>
              <p className="mt-4 text-base font-semibold text-ink-primary">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-surface p-8 text-center">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-primary">
            Ready to see your roadmap?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">
            Describe your goal today and follow a plan built just for you. It takes less than ten
            minutes to go from idea to personalized learning path.
          </p>
          <Link
            to="/login"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent-600"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
