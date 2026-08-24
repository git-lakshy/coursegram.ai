import { forwardRef } from "react"
import type { SelectHTMLAttributes } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-flex">
      <select
        ref={ref}
        className={cn(
          "h-8 appearance-none rounded-md border border-border bg-surface pl-2.5 pr-7 text-sm font-medium text-ink-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-secondary" />
    </div>
  ),
)
Select.displayName = "Select"
