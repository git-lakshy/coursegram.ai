import { useEffect, useRef, useState } from "react"
import { ArrowUp, Loader2, Sparkles } from "lucide-react"

import { MarkdownContent } from "@/components/common/MarkdownContent"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { ApiError, sendAssistantMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/types"

const SUGGESTIONS = [
  "What should I learn next?",
  "Build me a weekly study plan",
  "Explain my current topic simply",
]

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-accent-600 px-3.5 py-2 text-sm text-surface">
          {message.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] gap-2">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700">
          <Sparkles className="h-3 w-3" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-border bg-surface px-3.5 py-2 text-sm leading-relaxed text-ink-primary">
          <MarkdownContent content={message.content} />
        </div>
      </div>
    </div>
  )
}

export function Assistant() {
  const { token, profile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isBusy])

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
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      send(draft)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4 pt-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight text-ink-primary">AI Assistant</h1>
        <p className="text-sm text-ink-secondary">
          Grounded in your profile{profile?.target_role_slug ? ` and the ${profile.target_role_slug} track` : ""}.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-primary">Ask anything about your learning path</p>
              <p className="text-xs text-ink-muted">Enter to send, Shift plus Enter for a new line</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:border-ink-muted hover:text-ink-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => <ChatBubble key={index} message={message} />)
        )}
        {isBusy ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-surface px-3.5 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-muted" />
              <span className="text-xs text-ink-muted">Thinking...</span>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error !== null ? <p className="pb-2 text-center text-xs text-red-600">{error}</p> : null}

      <div className="sticky bottom-0 bg-background pb-4 pt-1">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            send(draft)
          }}
          className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm focus-within:border-accent-500"
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the assistant..."
            rows={1}
            className={cn(
              "max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:outline-none",
            )}
          />
          <Button
            type="submit"
            size="icon"
            variant="accent"
            className="h-8 w-8 shrink-0 rounded-xl"
            disabled={isBusy || draft.trim() === ""}
            aria-label="Send message"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-ink-muted">
          AI responses can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
