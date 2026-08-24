import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { GraduationCap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { ApiError } from "@/lib/api"

type Mode = "login" | "register"

export function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const canSubmit = useMemo(
    () => email.length > 2 && password.length >= 8 && !isBusy,
    [email, password, isBusy],
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsBusy(true)
    try {
      if (mode === "login") {
        await login(email, password)
      } else {
        await register(email, password, displayName)
      }
      navigate("/", { replace: true })
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      setError(
        status === 401
          ? "Invalid email or password."
          : status === 409
            ? "That email is already registered."
            : "Something went wrong. Try again.",
      )
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <GraduationCap className="h-5 w-5 text-accent-600" />
          <span className="text-base font-semibold text-ink-primary">Coursegram.ai</span>
        </div>

        <Card className="p-5">
          <h1 className="text-base font-semibold text-ink-primary">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-0.5 text-sm text-ink-secondary">
            {mode === "login"
              ? "Sign in to continue your learning path."
              : "Start building your personalized learning path."}
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {mode === "register" ? (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-secondary">Name</span>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-secondary">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-secondary">Password</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>

            {error !== null ? <p className="text-xs text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {isBusy ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login")
              setError(null)
            }}
            className="mt-3 w-full text-center text-xs text-ink-secondary hover:text-ink-primary"
          >
            {mode === "login" ? "No account yet? Create one" : "Already have an account? Sign in"}
          </button>
        </Card>
      </div>
    </div>
  )
}
