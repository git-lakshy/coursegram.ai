import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowUp, Check, Loader2, Sparkles, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { MarkdownContent } from "@/components/common/MarkdownContent"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import {
  ApiError,
  clearChatHistory,
  executeAssistantActions,
  getChatHistory,
  getProfile,
  sendAssistantMessage,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import type { AssistantAction, ChatMessage } from "@/types"

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

function actionSummary(action: AssistantAction): string {
  switch (action.type) {
    case "add_known_topics":
      return `Mark topics as known: ${action.topics?.join(", ") ?? ""}`
    case "remove_known_topics":
      return `Mark topics for revisiting: ${action.topics?.join(", ") ?? ""}`
    case "mark_stage_completed":
      return `Mark stage ${action.stage_position ?? ""} as completed`
    case "add_stage":
      return `Add stage "${action.stage_name ?? ""}" with topics: ${action.stage_topics?.join(", ") ?? ""}`
    case "remove_stage":
      return `Remove stage ${action.stage_position ?? ""}`
    case "set_skill_level":
      return `Set skill level to ${action.level ?? ""}`
    case "track_course":
      return `Mark course ${action.resource_id ?? ""} as ${action.status ?? "learning"}`
    case "save_resource":
      return `Save resource ${action.resource_id ?? ""}`
    case "set_project_state":
      return `Set project ${action.project_id ?? ""} to ${action.state ?? ""}`
    case "generate_project":
      return `Generate a new project${action.hint ? ` (${action.hint})` : ""}`
    case "generate_assessment":
      return `Prepare an assessment for stage ${action.stage_position ?? ""}`
    default:
      return action.type
  }
}

function ActionConfirmation({
  actions,
  onConfirmed,
  onCancelled,
}: {
  actions: AssistantAction[]
  onConfirmed: () => void
  onCancelled: () => void
}) {
  const { token, setProfile } = useAuth()
  const queryClient = useQueryClient()
  const [isApplying, setIsApplying] = useState(false)
  const [results, setResults] = useState<
    { applied: boolean; label: string }[] | null
  >(null)

  async function confirm() {
    if (token === null || isApplying) return
    setIsApplying(true)
    try {
      const response = await executeAssistantActions(token, actions)
      setResults(
        response.results.map((result, index) => ({
          applied: result.applied,
          label: result.summary ?? result.reason ?? actionSummary(actions[index]),
        })),
      )
      await queryClient.invalidateQueries({ queryKey: ["progress"] })
      await queryClient.invalidateQueries({ queryKey: ["learning"] })
      await queryClient.invalidateQueries({ queryKey: ["next-with-resources"] })
      await queryClient.invalidateQueries({ queryKey: ["assessment-stages"] })
      await queryClient.invalidateQueries({ queryKey: ["user-projects"] })
      await queryClient.invalidateQueries({ queryKey: ["track-projects"] })
      try {
        setProfile(await getProfile(token))
      } catch {
        // keep the current profile view if the refetch fails
      }
      const appliedCount = response.results.filter((result) => result.applied).length
      toast.success(
        appliedCount === response.results.length
          ? "All changes applied"
          : `${appliedCount} of ${response.results.length} changes applied`,
      )
    } catch {
      toast.error("Could not apply the changes")
      setResults([])
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[85%] rounded-2xl rounded-tl-md border border-accent-600 bg-accent-50/40 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-800">
          <Sparkles className="h-3 w-3" />
          {results === null ? "The assistant proposes these changes. Apply them?" : "Result"}
        </p>
        <ul className="mt-1.5 space-y-1">
          {(results === null ? actions.map((action) => actionSummary(action)) : results.map((result) => result.label)).map(
            (label, index) => (
              <li key={index} className="flex items-start gap-1.5 text-xs text-ink-primary">
                {results === null ? (
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent-700" />
                ) : results[index].applied ? (
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent-700" />
                ) : (
                  <X className="mt-0.5 h-3 w-3 shrink-0 text-red-600" />
                )}
                {label}
              </li>
            ),
          )}
        </ul>
        {results === null ? (
          <div className="mt-2.5 flex gap-2">
            <Button variant="accent" size="sm" onClick={() => void confirm()} disabled={isApplying}>
              {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Yes, apply
            </Button>
            <Button variant="outline" size="sm" onClick={onCancelled} disabled={isApplying}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="mt-2.5" onClick={onConfirmed}>
            Done
          </Button>
        )}
      </div>
    </div>
  )
}

export function Assistant() {
  const { token, profile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState<AssistantAction[] | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [draft, setDraft] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isBusy])

  useEffect(() => {
    if (token === null || historyLoaded) return
    setHistoryLoaded(true)
    void (async () => {
      try {
        const data = await getChatHistory(token, 40)
        setMessages(data.messages.map((item) => ({ role: item.role, content: item.content })))
      } catch {
        setError("Could not load your chat history.")
      }
    })()
  }, [token, historyLoaded])

  if (token === null) {
    return null
  }

  async function clearHistory() {
    if (token === null || isClearing) return
    setIsClearing(true)
    try {
      await clearChatHistory(token)
      setMessages([])
      setError(null)
    } catch {
      setError("Could not clear your chat history.")
    } finally {
      setIsClearing(false)
    }
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (trimmed === "" || isBusy || token === null) return
    setError(null)
    setIsBusy(true)
    setPending(null)
    const history = messages
    setMessages((previous) => [...previous, { role: "user", content: trimmed }])
    setDraft("")
    try {
      const response = await sendAssistantMessage(token, trimmed, history)
      setMessages((previous) => [...previous, { role: "assistant", content: response.reply }])
      if (response.actions.length > 0) {
        setPending(response.actions)
      }
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
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink-primary">AI Assistant</h1>
          <p className="text-sm text-ink-secondary">
            Grounded in your profile{profile?.target_role_slug ? ` and the ${profile.target_role_slug} track` : ""}.
            {messages.length > 0 ? " Showing your recent conversation." : ""}
          </p>
        </div>
        {messages.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void clearHistory()}
            disabled={isClearing}
            className="shrink-0 text-ink-muted hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isClearing ? "Clearing..." : "Clear"}
          </Button>
        ) : null}
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
        {pending !== null && !isBusy ? (
          <ActionConfirmation
            actions={pending}
            onConfirmed={() => setPending(null)}
            onCancelled={() => setPending(null)}
          />
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
