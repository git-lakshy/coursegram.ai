import { Link } from "react-router-dom"
import {
  ArrowRight,
  GraduationCap,
  Play,
  Route,
  ChartNoAxesCombined,
  Zap,
  Sparkles,
} from "lucide-react"

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

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* bright core toward the lower right */}
      <div
        className="absolute h-[42rem] w-[42rem] rounded-full"
        style={{
          right: "-8rem",
          bottom: "-10rem",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.55) 0%, rgba(16,185,129,0.18) 28%, rgba(16,185,129,0.05) 55%, transparent 72%)",
        }}
      />
      <div
        className="absolute h-72 w-72 rounded-full"
        style={{
          right: "6rem",
          bottom: "2rem",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(209,250,229,0.5) 30%, transparent 70%)",
          filter: "blur(6px)",
        }}
      />
      {/* thin curved light streams radiating from the core */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        <defs>
          <radialGradient id="streamFade" cx="85%" cy="85%" r="90%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
            <stop offset="35%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[
          "M1220,780 C1000,700 760,640 420,700 C260,728 140,700 40,620",
          "M1230,770 C1060,620 880,470 600,420 C420,388 240,420 80,360",
          "M1240,760 C1120,560 980,340 760,220 C600,132 400,140 220,80",
          "M1250,750 C1200,520 1120,300 940,160 C820,66 680,40 560,-20",
          "M1260,740 C1290,520 1300,300 1200,140 C1130,30 1020,-30 940,-80",
          "M1235,765 C1010,740 700,780 460,860 C320,906 180,900 60,860",
        ].map((path, index) => (
          <path
            key={index}
            d={path}
            stroke="url(#streamFade)"
            strokeWidth={index % 2 === 0 ? 1.4 : 0.8}
            opacity={0.5 + (index % 3) * 0.15}
          />
        ))}
      </svg>
      {/* film grain */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.16] mix-blend-overlay">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <HeroBackground />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent-600" />
            <span className="text-sm font-semibold tracking-tight text-ink-primary">
              Coursegram.ai
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-ink-secondary md:flex">
            <a href="#features" className="transition-colors hover:text-ink-primary">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-ink-primary">How It Works</a>
            <a href="#roadmap" className="transition-colors hover:text-ink-primary">Roadmap</a>
            <a href="#pricing" className="transition-colors hover:text-ink-primary">Pricing</a>
            <a href="#institutions" className="transition-colors hover:text-ink-primary">For Institutions</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
            >
              Log in
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 rounded-md bg-ink-primary px-3 py-1.5 text-sm font-medium text-surface transition-colors hover:bg-ink-primary/90"
            >
              Get Started Free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-14 md:pt-24">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-accent-700 backdrop-blur">
              <Sparkles className="h-3 w-3" />
              AI-Powered Learning Paths
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-ink-primary md:text-6xl">
              Learn Smarter.
              <br />
              Achieve Faster.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-secondary">
              Coursegram.ai builds your personalized roadmap, closes your skill
              gaps, and helps you become job-ready, faster than ever.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-600 px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent-700"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/80 px-4 py-2.5 text-sm font-medium text-ink-primary backdrop-blur transition-colors hover:bg-surface"
              >
                <Play className="h-3.5 w-3.5" />
                See How It Works
              </a>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["LC", "AR", "PK", "SM"].map((initials, index) => (
                  <span
                    key={initials}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-accent-100 text-[10px] font-semibold text-accent-700"
                    style={{ zIndex: 4 - index }}
                  >
                    {initials}
                  </span>
                ))}
              </div>
              <p className="text-xs leading-snug text-ink-muted">
                Join 10,000+ learners
                <br />
                building their future with AI
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="relative z-10 mx-auto max-w-6xl px-4 pb-14">
          <div className="grid gap-6 rounded-xl border border-border bg-surface/90 p-6 shadow-sm backdrop-blur md:grid-cols-4 md:gap-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <feature.icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-ink-primary">{feature.title}</p>
                <p className="text-xs leading-relaxed text-ink-secondary">{feature.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="relative z-10 mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-xl font-semibold tracking-tight text-ink-primary">How it works</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
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
              <div key={item.step} className="rounded-xl border border-border bg-surface p-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-50 text-xs font-semibold text-accent-700">
                  {item.step}
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-primary">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <h2 className="text-lg font-semibold tracking-tight text-ink-primary">
              Turn an unclear goal into a clear path forward
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">
              Start free and get your personalized learning roadmap in minutes.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-accent-600 px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent-700"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="relative z-10 border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-ink-muted">
            <span>Coursegram.ai</span>
            <span>Learn smarter, achieve faster.</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
