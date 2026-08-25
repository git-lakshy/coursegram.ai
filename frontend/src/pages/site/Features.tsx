import {
  Bot,
  ChartNoAxesCombined,
  ClipboardCheck,
  GraduationCap,
  Route,
  TrendingUp,
} from "lucide-react"

import { SiteFooter, SiteNav } from "@/components/site/SitePage"

const FEATURES = [
  {
    icon: Route,
    title: "AI Personalized Roadmaps",
    detail:
      "Every learner is different, so a single syllabus never fits everyone. Coursegram builds a roadmap around your goal, your current skill level, and the time you can commit. The result is a step by step path that takes you from where you are to where you want to be, without filler topics you have already mastered.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Skill Gap Analysis with Radar",
    detail:
      "Describe your target role and we map it into concrete skills. A proficiency quiz and your learning history feed an interactive radar chart that shows your strengths, your gaps, and how wide each one is. You always know exactly what to work on next instead of guessing.",
  },
  {
    icon: GraduationCap,
    title: "Curated Courses from Coursera",
    detail:
      "Instead of dumping thousands of search results on you, Coursegram recommends courses from Coursera that match each milestone in your roadmap. Every recommendation fits the exact skill you need at that point in the path, so your time goes toward learning, not hunting.",
  },
  {
    icon: ClipboardCheck,
    title: "Projects and Assessments",
    detail:
      "Watching videos alone does not build skills. Each phase of your roadmap includes hands-on projects and assessments that prove you can apply what you learned. Completing them updates your skill profile automatically, keeping your progress data honest and current.",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    detail:
      "Stuck on a concept at midnight? The built-in AI assistant knows your goal, your roadmap, and what you have completed so far. Ask it to explain a topic, unblock a project, or adjust your plan when life happens. It answers with context about you, not generic answers.",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    detail:
      "Tick off topics as you complete them and watch your roadmap fill up. Completion percentages per stage, streaks, and skill growth over time give you a clear picture of momentum. Progress data also feeds back into the AI so your plan adapts as you improve.",
  },
]

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-6 py-14">
        <h1 className="max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink-primary md:text-5xl">
          Everything you need to learn faster
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          Most learners do not fail because they lack motivation. They fail because they waste months
          on unfocused tutorials, outdated playlists, and paths that were never designed for them.
          Coursegram brings roadmaps, resources, assessment, and tracking together in one place so
          every study session moves you forward.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border bg-surface p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <feature.icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-semibold text-ink-primary">{feature.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{feature.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-surface p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-primary">
            Built for real learning, not busywork
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <p className="text-sm leading-relaxed text-ink-secondary">
              Roadmaps are generated from your actual proficiency level. If you already know React
              fundamentals, your frontend track starts at hooks and state management, not at what a
              div is. Nothing is repeated, nothing essential is skipped.
            </p>
            <p className="text-sm leading-relaxed text-ink-secondary">
              Skill gap analysis turns vague goals like becoming a data analyst into measurable
              targets across SQL, statistics, visualization, and domain knowledge. Your radar chart
              updates after every assessment so improvement is visible within weeks, not semesters.
            </p>
            <p className="text-sm leading-relaxed text-ink-secondary">
              Curated Coursera recommendations mean every course on your path has been matched to a
              specific milestone. You spend your hours learning from world class instructors instead
              of comparing tabs and reading reviews.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
