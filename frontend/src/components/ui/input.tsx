import { forwardRef } from "react"
import type { InputHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500",
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = "Input"
