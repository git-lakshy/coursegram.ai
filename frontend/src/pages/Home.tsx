import { Link } from "react-router-dom"
import {
  ArrowRight,
  GraduationCap,
  Play,
  Route,
  ChartNoAxesCombined,
  Zap,
  LayoutDashboard,
} from "lucide-react"

import { useAuth } from "@/hooks/useAuth"

const FEATURES = [
  {
    icon: Route,
    title: "Personalized Roadmaps",
    detail: "AI creates a learning path just for you.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Skill Gap Analysis",
    detail: "Know what you know and what you need to learn.",
  },
  {
    icon: GraduationCap,
    title: "Curated Resources",
    detail: "Top courses, projects and assessments in one place.",
  },
  {
    icon: Zap,
    title: "Learn. Practice. Grow.",
    detail: "Hands-on projects and real assessments to level up.",
  },
]

export default function Home() {
  const { token, isLoading } = useAuth()
  const appHref = token === null ? "/login" : "/dashboard"
  const appLabel = token === null ? "Get Started Free" : "Open Dashboard"

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/coursegram-bg.png)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(250,250,250,0.94) 0%, rgba(250,250,250,0.82) 34%, rgba(250,250,250,0.35) 60%, rgba(250,250,250,0) 80%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-primary text-surface">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold tracking-tight text-ink-primary">
              Coursegram.ai
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-ink-secondary lg:flex">
            <a href="#features" className="transition-colors hover:text-ink-primary">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-ink-primary">How it Works</a>
            <a href="#roadmap" className="transition-colors hover:text-ink-primary">Roadmap</a>
            <a href="#pricing" className="transition-colors hover:text-ink-primary">Pricing</a>
            <a href="#institutions" className="transition-colors hover:text-ink-primary">For Institutions</a>
          </nav>
          <div className="flex items-center gap-3">
            {isLoading ? null : token !== null ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent-600"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-ink-primary transition-colors hover:text-ink-secondary"
                >
                  Log in
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent-700 px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent-600"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 py-12">
          <div className="max-w-xl">
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-ink-primary md:text-[4.25rem]">
              Learn Smarter.
              <br />
              <span className="text-accent-700">Achieve Faster.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-secondary">
              Coursegram.ai builds your personalized roadmap, closes your skill
              gaps, and helps you become job-ready, faster than ever.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={appHref}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-700 px-5 py-3 text-sm font-semibold text-surface transition-colors hover:bg-accent-600"
              >
                {appLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/90 px-5 py-3 text-sm font-semibold text-ink-primary backdrop-blur transition-colors hover:bg-surface"
              >
                See How It Works
                <Play className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-9 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["LC", "AR", "PK", "SM"].map((initials, index) => (
                  <span
                    key={initials}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-accent-100 text-[11px] font-semibold text-accent-700"
                    style={{ zIndex: 4 - index }}
                  >
                    {initials}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-snug text-ink-secondary">
                Join 10,000+ learners
                <br />
                building their future with AI
              </p>
            </div>
          </div>
        </main>

        <section id="features" className="mx-auto w-full max-w-7xl px-6 pb-10">
          <div className="grid gap-6 rounded-2xl border border-border bg-surface/85 p-7 shadow-sm backdrop-blur md:grid-cols-4 md:gap-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <feature.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-primary">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">{feature.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-7xl px-6 pb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-primary">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Describe your goal",
                detail: "Tell Coursegram what you want to become, in your own words, with your timeline and what you already know.",
              },
              {
                step: "2",
                title: "Get analyzed and quizzed",
                detail: "The AI identifies your skill areas, checks your proficiency, and maps exactly what you are missing.",
              },
              {
                step: "3",
                title: "Follow your path",
                detail: "A personalized roadmap with milestones, courses and assessments that adapts as you progress.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-border bg-surface/90 p-5 backdrop-blur">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-50 text-xs font-semibold text-accent-700">
                  {item.step}
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-primary">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-7xl px-6 pb-16">
          <div className="rounded-2xl border border-border bg-surface/90 p-8 text-center backdrop-blur">
            <h2 className="text-lg font-semibold tracking-tight text-ink-primary">
              Turn an unclear goal into a clear path forward
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">
              Start free and get your personalized learning roadmap in minutes.
            </p>
            <Link
              to={appHref}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent-600"
            >
              {appLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-border/60">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-ink-muted">
            <span>Coursegram.ai</span>
            <span>Learn smarter, achieve faster.</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
