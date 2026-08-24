import { ClipboardCheck } from "lucide-react"

import { EmptyState } from "@/components/common/EmptyState"

export function Assessments() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">Assessments</h1>
        <p className="text-sm text-ink-secondary">Skill checks to validate roadmap progress.</p>
      </div>
      <EmptyState
        icon={ClipboardCheck}
        title="Assessments are not available yet"
        description="The backend does not have an assessments endpoint yet. This section will populate once it does."
      />
    </div>
  )
}
