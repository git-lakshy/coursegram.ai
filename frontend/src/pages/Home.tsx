import { Link } from "react-router-dom"
import {
  ArrowRight,
  Bot,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  Network,
  Route,
  Sparkles,
} from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { SiteFooter, SiteNav } from "@/components/site/SitePage"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const FAQS = [
  {
    q: "How does Coursegram build my roadmap?",
    a: "Describe your goal in plain language. The AI matches it to one of 90 plus career tracks, checks your current proficiency with a quick analysis, and generates a phased roadmap with milestones that skips what you already know.",
  },
  {
    q: "Is Coursegram free?",
    a: "Yes. The personalized roadmap, skill graph, AI assistant, and progress tracking are free while the product is in open beta.",
  },
  {
    q: "What can I learn?",
    a: "Any track in the catalog: full stack, devops, data science, machine learning, backend, frontend, android, and many more, each with a structured skill graph.",
  },
  {
    q: "Do I need a credit card?",
    a: "No. Create an account with your email and start building your learning path immediately.",
  },
]

const STATS = [
  { value: "92+", label: "Career tracks" },
  { value: "150+", label: "Curated resources" },
  { value: "Free", label: "While in open beta" },
]

const FEATURES = [
  {
    icon: Route,
    title: "Personalized roadmaps",
    detail: "A phased plan from where you are to job-ready, with milestones you can actually ship.",
  },
  {
    icon: Network,
    title: "Skill graphs",
    detail: "See every skill your goal requires and exactly which ones you are missing.",
  },
  {
    icon: Bot,
    title: "AI assistant",
    detail: "Ask anything about your path and get answers grounded in your own roadmap.",
  },
  {
    icon: BookOpen,
    title: "Course matching",
    detail: "Curated courses and resources mapped to each skill, so you never search blindly again.",
  },
  {
    icon: ClipboardCheck,
    title: "Assessments",
    detail: "Quick proficiency checks calibrate the plan and skip what you already know.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Progress tracking",
    detail: "Every completed milestone regenerates the roadmap around your latest progress.",
  },
]

const STEPS = [
  {
    number: "01",
    title: "Describe goal",
    detail: "Tell Coursegram what you want to become in plain language.",
  },
  {
    number: "02",
    title: "Skill assessment",
    detail: "A quick analysis maps what you know against what the role needs.",
  },
  {
    number: "03",
    title: "Adaptive roadmap",
    detail: "Follow a phased plan that reshapes itself as you learn.",
  },
]

const PROVIDERS = [
  "Harvard CS50",
  "Stanford",
  "MIT OCW",
  "Coursera",
  "freeCodeCamp",
  "3Blue1Brown",
  "Andrew Ng",
  "NeetCode",
]

function DashboardMock() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-subtle">
      <div className="flex items-center gap-2 border-b border-border/70 bg-background px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="ml-3 text-xs font-medium text-ink-muted">app.coursegram.com/dashboard</span>
      </div>
      <div className="flex">
        <div className="hidden w-36 shrink-0 flex-col gap-1 border-r border-border/70 p-3 sm:flex">
          {["Overview", "Roadmap", "Skills", "Courses", "Assessments"].map((item, i) => (
            <span
              key={item}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                i === 1 ? "bg-accent-50 text-accent-700" : "text-ink-secondary"
              }`}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="flex-1 space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-sm font-semibold text-ink-primary">Frontend Engineer</p>
              <p className="text-xs text-ink-muted">Phase 2 of 5 · React & TypeScript</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-accent-50 px-2 py-1 text-xs font-semibold text-accent-700">
              <Sparkles className="h-3 w-3" />
              On track
            </span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "HTML & CSS", pct: "100%" },
              { label: "JavaScript fundamentals", pct: "82%" },
              { label: "React", pct: "54%" },
              { label: "TypeScript", pct: "18%" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-secondary">{row.label}</span>
                  <span className="font-medium text-ink-muted">{row.pct}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-accent-600"
                    style={{ width: row.pct }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {[
              { value: "12", label: "Milestones done" },
              { value: "7", label: "In progress" },
              { value: "68%", label: "Track complete" },
            ].map((chip) => (
              <div key={chip.label} className="rounded-md border border-border bg-background px-2.5 py-2">
                <p className="font-display text-sm font-semibold text-ink-primary">{chip.value}</p>
                <p className="truncate text-[11px] text-ink-muted">{chip.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { token, isLoading } = useAuth()
  const appHref = token === null ? "/login" : "/dashboard"
  const primaryLabel = token === null ? "Start learning free" : "Open Dashboard"

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700">
              <Sparkles className="h-3 w-3" />
              Now in open beta
            </span>
            <h1 className="font-display mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-ink-primary md:text-5xl">
              Learn smarter.
              <br />
              Achieve <span className="text-accent-600">faster.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-secondary">
              Coursegram turns a goal into a personalized roadmap, closes your
              skill gaps, and adapts every time you learn something new.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to={appHref}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent-600"
              >
                {isLoading ? "Get Started" : primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink-primary transition-colors hover:bg-background"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-xs text-ink-muted">
              <Check className="h-3.5 w-3.5 text-accent-600" />
              No credit card required · Free while in beta
            </p>
          </div>
          <DashboardMock />
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 divide-y divide-border/60 px-6 py-8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5 py-3 text-center">
              <p className="font-display text-2xl font-bold tracking-tight text-ink-primary">{stat.value}</p>
              <p className="text-sm text-ink-secondary">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-xl">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">
            Features
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink-primary">
            Everything you need to go from goal to job-ready
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-surface p-5 shadow-subtle transition-colors hover:border-accent-200"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <feature.icon className="h-4 w-4" />
              </div>
              <p className="font-display mt-3.5 text-sm font-semibold text-ink-primary">{feature.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{feature.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
          <div className="mx-auto max-w-xl text-center">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">
              How it works
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink-primary">
              Three steps to a clear path
            </h2>
          </div>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((step) => (
              <li key={step.number} className="relative">
                <span className="font-display text-sm font-semibold text-accent-600">{step.number}</span>
                <p className="font-display mt-2 text-base font-semibold text-ink-primary">{step.title}</p>
                <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-secondary">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
          Built on trusted resources
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {PROVIDERS.map((provider) => (
            <span
              key={provider}
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:border-ink-muted hover:text-ink-primary"
            >
              {provider}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-6 pb-16">
        <h2 className="font-display text-center text-2xl font-bold tracking-tight text-ink-primary">
          Frequently asked questions
        </h2>
        <Accordion className="mt-6">
          {FAQS.map((faq, index) => (
            <AccordionItem key={faq.q} defaultOpen={index === 0}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm leading-relaxed text-ink-secondary">{faq.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="rounded-lg border border-accent-200 bg-accent-50 px-6 py-12 text-center md:py-14">
          <h2 className="font-display mx-auto max-w-md text-2xl font-bold tracking-tight text-ink-primary md:text-3xl">
            Your future is built one skill at a time.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-secondary">
            Start your personalized learning journey today. It&apos;s free while in beta.
          </p>
          <Link
            to={appHref}
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-accent-700 px-6 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent-600"
          >
            {isLoading ? "Get Started" : primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
