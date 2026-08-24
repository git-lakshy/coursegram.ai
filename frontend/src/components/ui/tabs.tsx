import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type TabsContextValue = {
  value: string
  setValue: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

export function Tabs({
  defaultValue,
  className,
  children,
}: {
  defaultValue: string
  className?: string
  children: ReactNode
}) {
  const [value, setValue] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md border border-border bg-background p-0.5", className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const context = useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within Tabs")
  const isActive = context.value === value
  return (
    <button
      type="button"
      onClick={() => context.setValue(value)}
      className={cn(
        "rounded-sm px-2.5 py-1 text-sm font-medium transition-colors",
        isActive ? "bg-surface text-ink-primary shadow-subtle" : "text-ink-secondary hover:text-ink-primary",
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const context = useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within Tabs")
  if (context.value !== value) return null
  return <div>{children}</div>
}
