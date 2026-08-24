import { Sparkles } from "lucide-react"

import { Card } from "@/components/ui/card"

export function AiAssistantPanel() {
  return (
    <Card className="flex flex-col gap-2 p-3.5">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-50 text-accent-600">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <p className="text-sm font-semibold text-ink-primary">AI Assistant</p>
      </div>
      <p className="text-sm text-ink-secondary">
        The recommendation assistant is not connected yet. Once available, it will suggest next
        topics and courses based on your progress.
      </p>
      <span className="inline-flex w-fit items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-ink-muted">
        Not connected
      </span>
    </Card>
  )
}
