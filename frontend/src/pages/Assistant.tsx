import { useEffect, useRef, useState } from "react"
import { Loader2, SendHorizonal, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { ApiError, sendAssistantMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types"

const SUGGESTIONS = [
  "What should I learn next?",
  "Explain the topic I am stuck on",
  "Build me a weekly study plan",
]

export function Assistant() {
  const { token, profile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (token === null) {
    return null
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (trimmed === "" || isBusy || token === null) return
    setError(null)
    setIsBusy(true)
    const history = messages
    setMessages((previous) => [...previous, { role: "user", content: trimmed }])
    setDraft("")
    try {
      const response = await sendAssistantMessage(token, trimmed, history)
      setMessages((previous) => [...previous, { role: "assistant", content: response.reply }])
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      setError(
        status === 503
          ? "The assistant needs an LLM key on the server (GROQ_API_KEY or NVIDIA_API_KEY)."
          : "The assistant could not reply. Try again.",
      )
      setMessages((previous) => previous.slice(0, -1))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4 py-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight text-ink-primary">AI Assistant</h1>
        <p className="text-sm text-ink-secondary">
          Grounded in your profile{profile?.target_role_slug ? ` and the ${profile.target_role_slug} track` : ""}.
        </p>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm text-ink-secondary">Ask anything about your learning path.</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-secondary hover:bg-background hover:text-ink-primary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  message.role === "user"
                    ? "ml-auto bg-accent-600 text-surface"
                    : "bg-background text-ink-primary",
                )}
              >
                {message.content}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {error !== null ? <p className="px-4 pb-1 text-xs text-red-600">{error}</p> : null}

        <form
          className="flex items-center gap-2 border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            send(draft)
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about your learning path..."
            disabled={isBusy}
          />
          <Button type="submit" size="icon" variant="accent" disabled={isBusy || draft.trim() === ""}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </Button>
        </form>
      </Card>
    </div>
  )
}
