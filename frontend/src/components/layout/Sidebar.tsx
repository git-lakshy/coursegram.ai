import { NavLink } from "react-router-dom"
import { GraduationCap } from "lucide-react"

import { NAV_SECTIONS } from "@/lib/navigation"
import { cn } from "@/lib/utils"

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full w-56 flex-col border-r border-border bg-surface">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <GraduationCap className="h-4 w-4 text-accent-600" />
        <span className="text-sm font-semibold text-ink-primary">Coursegram.ai</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent-50 text-accent-700"
                          : "text-ink-secondary hover:bg-background hover:text-ink-primary",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">
          L
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-primary">Learner</p>
          <p className="truncate text-xs text-ink-muted">Free plan</p>
        </div>
      </div>
    </div>
  )
}
