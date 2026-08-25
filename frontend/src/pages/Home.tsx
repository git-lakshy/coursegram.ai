import { Link } from "react-router-dom"
import {
  ArrowRight,
  GraduationCap,
  Route,
  ChartNoAxesCombined,
  Zap,
  LayoutDashboard,
  Check,
  Play,
} from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { SiteFooter } from "@/components/site/SitePage"
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

export default function Home() {
  const { token, isLoading } = useAuth()
  const appHref = token === null ? "/login" : "/dashboard"
  const appLabel = token === null ? "Get Started Free" : "Open Dashboard"

  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-20 border-b border-border/50"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.45) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-primary text-surface">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-ink-primary">
            Coursegram
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-primary lg:flex">
          <Link to="/features" className="transition-colors hover:text-accent-700">Features</Link>
          <Link to="/how-it-works" className="transition-colors hover:text-accent-700">How it Works</Link>
          <Link to="/roadmap" className="transition-colors hover:text-accent-700">Roadmap</Link>
          <Link to="/pricing" className="transition-colors hover:text-accent-700">Pricing</Link>
          <Link to="/institutions" className="transition-colors hover:text-accent-700">For Institutions</Link>
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
                className="text-sm font-semibold text-ink-primary transition-colors hover:text-accent-700"
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
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover"
          style={{ backgroundImage: "url(/coursegram-bg.png)", backgroundPosition: "72% center", transform: "scale(1.12)" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(250,250,250,0.96) 0%, rgba(250,250,250,0.85) 32%, rgba(250,250,250,0.3) 58%, rgba(250,250,250,0) 78%)",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          style={{ background: "linear-gradient(180deg, transparent 0%, #fafafa 100%)" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-28 pt-16 md:pt-24">
          <div className="max-w-xl">
            <h1 className="font-display text-5xl font-bold leading-[1.04] tracking-tight text-ink-primary md:text-6xl">
              Learn Smarter.
              <br />
              <span className="text-accent-700">Achieve Faster.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-secondary">
              Coursegram builds your personalized roadmap, closes your skill
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
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/90 px-5 py-3 text-sm font-semibold text-ink-primary backdrop-blur transition-colors hover:bg-surface"
              >
                See How It Works
                <Play className="h-4 w-4" />
              </Link>
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
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent-700">
            Dare to do better
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink-primary">
            An unclear goal becomes a clear path
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-secondary">
            Most learners juggle roadmap sites, course marketplaces, and their own
            notes. Coursegram replaces all of it with one loop: describe where you
            want to go, see exactly what you are missing, and follow a roadmap
            that adapts every time you learn something new.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Route,
              title: "Describe, do not search",
              detail: "Say what you want to become. The AI picks the right track and maps every skill it requires.",
            },
            {
              icon: ChartNoAxesCombined,
              title: "Know your gaps",
              detail: "A quick analysis and skill graph show precisely which topics stand between you and your goal.",
            },
            {
              icon: Zap,
              title: "Move with milestones",
              detail: "Every phase ends with something you can build, and the path regenerates as you progress.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <item.icon className="h-4 w-4" />
              </div>
              <p className="font-display mt-3 text-sm font-semibold text-ink-primary">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{item.detail}</p>
            </div>
          ))}
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
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-muted">
          <Check className="h-3.5 w-3.5 text-accent-600" />
          No credit card required
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
