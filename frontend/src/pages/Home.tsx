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
  { value: "90+", label: "Career tracks" },
  { value: "170+", label: "Learning resources" },
  { value: "Free", label: "Just Sign up and use" },
]

const FEATURES = [
  {
    icon: Route,
    title: "Personalized roadmaps",
    detail:
      "Describe your goal and get a phased plan with prerequisites and milestones. Topics you already know are skipped, not retaught.",
  },
  {
    icon: Network,
    title: "Skill graphs",
    detail:
      "Every track is a graph of topics and dependencies, so you see exactly which skills the role needs and which ones you are missing.",
  },
  {
    icon: BookOpen,
    title: "Matched resources",
    detail:
      "Courses from Coursera, Udemy, and edX plus curated picks, ranked against your next topics with your level and format in mind. Each match shows why it was chosen.",
  },
  {
    icon: ClipboardCheck,
    title: "Assessments",
    detail:
      "Stage checks scored server side. Fail one and its topics return to your roadmap for another pass; pass strong and you move on.",
  },
  {
    icon: Bot,
    title: "Grounded AI assistant",
    detail:
      "Answers cite the actual topics in your roadmap, explain why each recommendation fits, and can update your plan after you confirm the change.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Progress that adapts",
    detail:
      "Completed topics, stage feedback, and weekly skill development feed back into the plan, and regenerate it around reality.",
  },
]

const STEPS = [
  {
    number: "01",
    title: "Describe your goal",
    detail: "One sentence in plain language is enough to start.",
  },
  {
    number: "02",
    title: "Calibrate your level",
    detail: "A short quiz maps what you know against what the role needs.",
  },
  {
    number: "03",
    title: "Follow your roadmap",
    detail: "Work through the phases. The plan reshapes as you learn.",
  },
]

export default function Home() {
  const { token, isLoading } = useAuth()
  const appHref = token === null ? "/login" : "/dashboard"
  const primaryLabel = token === null ? "Build my roadmap" : "Open Dashboard"

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <section className="relative flex w-full items-center overflow-hidden border-b border-border/60">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/coursegram-bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/35" />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center px-6 py-16">
          <div className="max-w-2xl">
            <h1 className="font-display mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-ink-primary md:text-5xl">
              Resources are everywhere.
              <br />
              A <span className="text-accent-600">path</span> is not.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-secondary">
              Courses are not the problem. Coursegram turns any learning goal
              into a prerequisite aware roadmap, matches the right courses to
              every step, and adapts the plan every time you learn something.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
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
            <p className="mt-6 flex items-center gap-1.5 text-sm text-ink-secondary">
              <Check className="h-4 w-4 text-accent-600" />
              All resources are free. Just sign up and start using.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-surface">
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
            What you get
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink-primary">
            One system, from goal to job-ready
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
              Three steps to your roadmap
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

      <section className="mx-auto w-full max-w-3xl px-6 pb-20">
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

      <SiteFooter />
    </div>
  )
}
