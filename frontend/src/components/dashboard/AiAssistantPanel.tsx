import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Loader2, Sparkles, Waypoints } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MarkdownContent } from "@/components/common/MarkdownContent"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { ApiError, sendAssistantMessage } from "@/lib/api"

type AiAssistantPanelProps = {
  nextTopic: string | null
}

/**
 * Contextual assistant panel for the dashboard. It suggests the next topic
 * and can explain why it matters, using the same backend chat endpoint as
 * the full assistant page.
 */
export function AiAssistantPanel({ nextTopic }: AiAssistantPanelProps) {
  const { token } = useAuth()
  const [reply, setReply] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const question = nextTopic
    ? `Why is ${nextTopic} important and how should I learn it?`
    : "What should I focus on first in my learning path?"

  async function ask() {
    if (token === null || isBusy) return
    setIsBusy(true)
    setError(null)
    try {
      const response = await sendAssistantMessage(token, question, [])
      setReply(response.reply)
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      setError(
        status === 503
          ? "Assistant needs an LLM key on the server."
          : "The assistant could not reply. Try again.",
      )
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-2.5 p-3.5">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-50 text-accent-600">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <p className="text-sm font-semibold text-ink-primary">AI Assistant</p>
      </div>

      {reply === null ? (
        <>
          <p className="text-sm text-ink-secondary">
            {nextTopic
              ? `Next up for you: ${nextTopic}. Want to know why it matters?`
              : "Not sure where to start? Ask the assistant for guidance."}
          </p>
          {error !== null ? <p className="text-xs text-red-600">{error}</p> : null}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="accent" onClick={ask} disabled={isBusy || token === null}>
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Explain in detail
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/assistant">
                Open assistant
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm leading-relaxed text-ink-primary"><MarkdownContent content={reply} /></div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setReply(null)}>
              Ask something else
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/assistant">
                Continue chatting
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </>
      )}

      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-ink-muted">
        <Waypoints className="h-3 w-3" />
        Contextual to your roadmap
      </span>
    </Card>
  )
}

