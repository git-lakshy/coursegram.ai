import { Sparkles } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"

export function Assistant() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">AI Assistant</h1>
        <p className="text-sm text-ink-secondary">Ask about your roadmap and get tailored suggestions.</p>
      </div>
      <EmptyState
        icon={Sparkles}
        title="Assistant is not connected"
        description="A real recommendation engine has not been wired up yet. This page will host live conversations once it is."
      />
    </div>
  )
}
