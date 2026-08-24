import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-danger-500/30 bg-danger-50 px-6 py-8 text-center">
      <AlertTriangle className="h-5 w-5 text-danger-500" />
      <p className="text-sm font-medium text-danger-700">Something went wrong</p>
      <p className="max-w-sm text-sm text-ink-secondary">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
