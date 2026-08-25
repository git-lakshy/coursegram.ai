import { Link } from "react-router-dom"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-700">
        <Compass className="h-6 w-6" />
      </div>
      <p className="text-2xl font-semibold tracking-tight text-ink-primary">404</p>
      <p className="text-sm text-ink-secondary">This page does not exist or has moved.</p>
      <Button variant="accent" asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  )
}
