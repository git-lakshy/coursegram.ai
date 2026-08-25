import { Mail } from "lucide-react"

import { SiteFooter, SiteNav } from "@/components/site/SitePage"

const CAPABILITIES = [
  {
    title: "Cohort skill tracking",
    detail:
      "See exactly where every learner stands across the skills your program teaches. Instead of attendance sheets and gut feeling, instructors get a live skill graph per cohort showing who is ahead, who is stuck, and which concepts need a group review before the next module.",
  },
  {
    title: "Curriculum mapping",
    detail:
      "Map your existing curriculum onto Coursegram's prerequisite aware skill graphs. Every lesson, project, and assessment you already run gets connected to measurable skills, making it obvious where your program covers a topic deeply and where it only brushes past.",
  },
  {
    title: "Progress analytics",
    detail:
      "Understand completion rates, time per phase, assessment scores, and dropout risk signals across your whole institution or per cohort. Spot trends early: if three cohorts struggle with the same milestone, you fix one lesson instead of losing thirty students.",
  },
  {
    title: "Custom tracks",
    detail:
      "Build custom role tracks that reflect your own outcomes and hiring partners' needs. Combine Coursegram's reference data from over 92 roadmap.sh tracks with your internal projects and employer requirements so graduates finish with skills the market actually asks for.",
  },
]

export default function Institutions() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-6 py-14">
        <h1 className="max-w-2xl font-display text-4xl font-semibold tracking-tight text-ink-primary md:text-5xl">
          Coursegram for bootcamps and education teams
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          Running a bootcamp or training program means guiding dozens or hundreds of learners toward
          the same outcome, each starting from a different level. Coursegram gives your team the same
          personalized planning technology we give individual learners, plus the oversight tools
          instructors need to keep a whole cohort on track.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {CAPABILITIES.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-surface p-6">
              <p className="text-base font-semibold text-ink-primary">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-surface p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-primary">
            How teams use Coursegram
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <p className="text-sm leading-relaxed text-ink-secondary">
              Bootcamps place each incoming student on a personalized prework path based on a short
              proficiency quiz, so day one starts at the right level instead of the average level.
            </p>
            <p className="text-sm leading-relaxed text-ink-secondary">
              Corporate training teams assign role tracks to new hires and watch ramp-up progress in
              one dashboard, replacing ad hoc spreadsheets and check-in meetings.
            </p>
            <p className="text-sm leading-relaxed text-ink-secondary">
              Universities and online programs map existing courses into skill graphs and use
              assessment data to prove learning outcomes to accreditors and employers.
            </p>
          </div>
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-accent-50 p-8 text-center">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-primary">
            Interested in Coursegram for your institution?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-secondary">
            We are working closely with a small number of education partners on the upcoming Pro plan.
            Tell us about your program and we will get back to you within two business days.
          </p>
          <a
            href="mailto:institutions@coursegram.ai?subject=Coursegram%20for%20Institutions"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent-600"
          >
            <Mail className="h-4 w-4" />
            Contact our team
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
