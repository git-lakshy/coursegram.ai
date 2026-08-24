import type { HTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-background text-ink-secondary",
        accent: "bg-accent-50 text-accent-700",
        warn: "bg-warn-50 text-warn-700",
        danger: "bg-danger-50 text-danger-700",
        outline: "border border-border text-ink-secondary",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
)

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
