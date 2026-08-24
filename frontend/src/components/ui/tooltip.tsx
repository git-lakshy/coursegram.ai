import { useState } from "react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink-primary px-1.5 py-1 text-xs text-white transition-opacity",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      >
        {label}
      </span>
    </span>
  )
}
