import { UserRound } from "lucide-react"

import { Card } from "@/components/ui/card"

export function Profile() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">Profile</h1>
        <p className="text-sm text-ink-secondary">Your learner details.</p>
      </div>

      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 text-accent-700">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-primary">Learner</p>
          <p className="text-xs text-ink-muted">Account details are not available from the backend yet.</p>
        </div>
      </Card>
    </div>
  )
}
