import { Settings2 } from "lucide-react"

import { Card } from "@/components/ui/card"
import { API_BASE_URL } from "@/lib/config"

export function Settings() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-ink-primary">Settings</h1>
        <p className="text-sm text-ink-secondary">Environment and connection details.</p>
      </div>

      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background text-ink-secondary">
          <Settings2 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-primary">API base URL</p>
          <p className="text-xs text-ink-muted">{API_BASE_URL}</p>
        </div>
      </Card>
    </div>
  )
}
