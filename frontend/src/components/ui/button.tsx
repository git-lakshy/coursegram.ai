import { cloneElement, forwardRef, isValidElement } from "react"
import type { ButtonHTMLAttributes, ReactElement } from "react"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-ink-primary text-surface hover:bg-ink-primary/90",
        outline: "border border-border bg-surface text-ink-primary hover:bg-background",
        ghost: "text-ink-secondary hover:bg-background hover:text-ink-primary",
        accent: "bg-accent-600 text-surface hover:bg-accent-700",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        default: "h-8 px-3",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className)

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>
      return cloneElement(child, {
        className: cn(classes, child.props.className),
      })
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    )
  },
)
Button.displayName = "Button"
