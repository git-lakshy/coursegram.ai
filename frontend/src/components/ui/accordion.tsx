import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface", className)}>{children}</div>
  )
}

type AccordionItemContextValue = {
  isOpen: boolean
  toggle: () => void
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null)

export function AccordionItem({
  defaultOpen = false,
  className,
  children,
}: {
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <AccordionItemContext.Provider value={{ isOpen, toggle: () => setIsOpen((value) => !value) }}>
      <div className={cn("border-b border-border px-3 last:border-b-0", className)}>{children}</div>
    </AccordionItemContext.Provider>
  )
}

export function AccordionTrigger({ children }: { children: ReactNode }) {
  const context = useContext(AccordionItemContext)
  if (!context) throw new Error("AccordionTrigger must be used within AccordionItem")
  return (
    <button type="button" onClick={context.toggle} className="flex w-full items-center justify-between gap-2 py-2.5 text-left">
      {children}
      <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-secondary transition-transform", context.isOpen && "rotate-180")} />
    </button>
  )
}

export function AccordionContent({ children }: { children: ReactNode }) {
  const context = useContext(AccordionItemContext)
  if (!context) throw new Error("AccordionContent must be used within AccordionItem")
  if (!context.isOpen) return null
  return <div className="pb-3">{children}</div>
}
