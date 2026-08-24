import { Code2 } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"

export function Projects() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">Projects</h1>
        <p className="text-sm text-ink-secondary">Applied projects tied to your roadmap topics.</p>
      </div>
      <EmptyState
        icon={Code2}
        title="Projects are not available yet"
        description="The backend does not have a projects endpoint yet. This section will populate once it does."
      />
    </div>
  )
}
