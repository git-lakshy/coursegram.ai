import { Bell, Menu, Search, UserRound } from "lucide-react"

import { Input } from "@/components/ui/input"

export function Topbar({ onOpenMenu }: { onOpenMenu?: () => void }) {
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
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-background"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary hover:bg-background"
          aria-label="Account"
        >
          <UserRound className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
