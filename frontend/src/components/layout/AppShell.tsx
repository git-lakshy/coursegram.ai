import { useState } from "react"
import type { ReactNode } from "react"
import { X } from "lucide-react"

import { Sidebar } from "@/components/layout/Sidebar"
import { Topbar } from "@/components/layout/Topbar"

export function AppShell({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-ink-primary/30" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative z-50">
            <Sidebar onNavigate={() => setIsDrawerOpen(false)} />
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="absolute right-3 top-3 z-50 flex h-7 w-7 items-center justify-center rounded-md bg-surface text-ink-secondary"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setIsDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
