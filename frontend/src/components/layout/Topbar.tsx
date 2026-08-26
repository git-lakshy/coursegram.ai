import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Bell, Flame, Menu, Search, UserRound } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { useStreak } from "@/hooks/useStreak"
import { buildNotifications, readDismissedIds, storeDismissedIds } from "@/lib/notifications"
import { cn } from "@/lib/utils"

export function Topbar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { email, profile } = useAuth()
  const { streakDays } = useStreak()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissedIds())
  const containerRef = useRef<HTMLDivElement>(null)

  const notifications = useMemo(
    () => buildNotifications(email, profile).filter((item) => !dismissed.includes(item.id)),
    [email, profile, dismissed],
  )

  useEffect(() => {
    if (!isOpen) return
    function handleClick(event: MouseEvent) {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen])

  function dismissAll() {
    const ids = buildNotifications(email, profile).map((item) => item.id)
    const next = Array.from(new Set([...dismissed, ...ids]))
    setDismissed(next)
    storeDismissedIds(next)
  }

  return (
    <div className="flex h-12 items-center gap-3 border-b border-border bg-surface px-4">
      <button
        type="button"
        onClick={onOpenMenu}
        className="-ml-1 flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-background lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
        <Input placeholder="Search courses, skills, topics" className="pl-8" />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {streakDays > 0 ? (
          <span
            className="hidden items-center gap-1 rounded-md bg-accent-50 px-2 py-1 text-xs font-medium text-accent-700 sm:inline-flex"
            title={`${streakDays} day learning streak`}
          >
            <Flame className="h-3.5 w-3.5" />
            {streakDays}
          </span>
        ) : null}
        <div ref={containerRef} className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((previous) => !previous)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-background",
              isOpen && "bg-background text-ink-primary",
            )}
            aria-label="Notifications"
          >
            <span className="relative">
              <Bell className="h-4 w-4" />
              {notifications.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent-600" />
              ) : null}
            </span>
          </button>

          {isOpen ? (
            <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-border bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-sm font-semibold text-ink-primary">Notifications</p>
                {notifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={dismissAll}
                    className="text-xs text-ink-muted hover:text-ink-primary"
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-ink-muted">
                    You are all caught up.
                  </p>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        navigate(item.to)
                      }}
                      className="block w-full border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-background"
                    >
                      <p className="text-sm font-medium text-ink-primary">{item.title}</p>
                      <p className="mt-0.5 text-xs text-ink-secondary">{item.detail}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <Link
          to="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-background"
          aria-label="Account"
        >
          <UserRound className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
