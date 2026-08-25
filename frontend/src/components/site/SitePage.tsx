import { Link, NavLink } from "react-router-dom"
import {
  ArrowRight,
  Check,
  Github,
  GraduationCap,
  LayoutDashboard,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react"

import { useAuth } from "@/hooks/useAuth"

const NAV_LINKS = [
  { label: "Features", to: "/features" },
  { label: "How it Works", to: "/how-it-works" },
  { label: "Roadmap", to: "/roadmap" },
  { label: "Pricing", to: "/pricing" },
  { label: "For Institutions", to: "/institutions" },
]

export function SiteNav() {
  const { token, isLoading } = useAuth()

  return (
    <header className="border-b border-border/60 bg-surface/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-primary text-surface">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight text-ink-primary">
            Coursegram.ai
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `transition-colors hover:text-ink-primary ${
                  isActive ? "font-semibold text-ink-primary" : "font-medium text-ink-secondary"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
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
      </div>
    </header>
  )
}

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/features" },
      { label: "Roadmap", to: "/roadmap" },
      { label: "AI Assistant", href: "#" },
      { label: "Projects", href: "#" },
      { label: "Assessments", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press Kit", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Guides", href: "#" },
      { label: "Community", href: "#" },
      { label: "API Docs", href: "#" },
      { label: "For Institutions", to: "/institutions" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/legal" },
      { label: "Terms of Service", to: "/legal" },
      { label: "Refund Policy", to: "/legal" },
      { label: "Cookies Policy", to: "/legal" },
    ],
  },
]

const SOCIALS = [
  { icon: Github, href: "#" },
  { icon: Linkedin, href: "#" },
  { icon: Twitter, href: "#" },
  { icon: Youtube, href: "#" },
]

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer>
      <div className="mx-auto w-full max-w-5xl px-6 pb-12">
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/footer-bg.png)" }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0) 100%)",
            }}
            aria-hidden="true"
          />
          <div className="relative z-10 grid gap-8 p-8 md:grid-cols-2 md:p-12">
            <div className="md:pr-10">
              <h2 className="max-w-md font-display text-3xl font-bold leading-tight tracking-tight text-ink-primary">
                Your future is built{" "}
                <span className="text-accent-700">one skill at a time.</span>
              </h2>
            </div>
            <div className="flex flex-col items-start gap-3 md:border-l md:border-border/70 md:pl-10">
              <p className="text-sm leading-relaxed text-ink-secondary">
                Start your personalized learning
                <br />
                journey today. It&apos;s free.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent-600"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <Check className="h-3.5 w-3.5 text-accent-600" />
                No credit card required
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-12 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-primary text-surface">
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="text-base font-semibold tracking-tight text-ink-primary">
                Coursegram.ai
              </span>
            </Link>
            <p className="mt-4 text-sm font-semibold text-ink-primary">Dare to do better.</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-secondary">
              AI-powered learning paths that help you learn smarter and achieve faster.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.icon.displayName}
                  href={social.href}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-secondary transition-colors hover:bg-accent-50 hover:text-accent-700"
                  aria-label={social.icon.displayName}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-ink-primary">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {"to" in link && link.to ? (
                      <Link
                        to={link.to}
                        className="text-sm text-ink-secondary transition-colors hover:text-ink-primary"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href="#"
                        className="text-sm text-ink-secondary transition-colors hover:text-ink-primary"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-ink-muted">
            <span>&copy; {year} Coursegram.ai</span>
            <span>Learn smarter, achieve faster.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

