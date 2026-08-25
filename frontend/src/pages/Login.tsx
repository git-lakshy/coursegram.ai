import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { GraduationCap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { firebaseEnabled } from "@/lib/firebase"

type Mode = "login" | "register"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

export function Login() {
  const { login, loginWithGoogle, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard"
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

  function friendlyError(err: unknown): string {
    const message = err instanceof Error ? err.message : ""
    if (message.includes("email-already-in-use")) return "That email is already registered."
    if (message.includes("invalid-credential") || message.includes("wrong-password"))
      return "Invalid email or password."
    if (message.includes("weak-password")) return "Password must be at least 6 characters."
    if (message.includes("popup-closed") || message.includes("cancelled-popup"))
      return "Google sign in was cancelled."
    if (message.includes("Database is not active")) return message
    return "Something went wrong. Try again."
  }

  async function handleGoogle() {
    setError(null)
    setIsBusy(true)
    try {
      await loginWithGoogle()
      navigate(from, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setIsBusy(false)
    }
  }

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
      navigate(from, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setIsBusy(false)
    }
  }

  const heading = mode === "login" ? "Welcome back" : "Create your account"
  const subheading =
    mode === "login"
      ? "Sign in to continue your learning path."
      : "Start building your personalized learning path."
  const googleLabel = mode === "login" ? "Continue with Google" : "Sign up with Google"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <GraduationCap className="h-5 w-5 text-accent-600" />
          <span className="font-display text-base font-semibold tracking-tight text-ink-primary">
            Coursegram.ai
          </span>
        </div>

        <Card className="p-6">
          <h1 className="font-display text-lg font-bold tracking-tight text-ink-primary">{heading}</h1>
          <p className="mt-0.5 text-sm text-ink-secondary">{subheading}</p>

          {firebaseEnabled ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="mt-5 w-full"
                onClick={handleGoogle}
                disabled={isBusy}
              >
                <GoogleIcon />
                {googleLabel}
              </Button>
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-ink-muted">or use email</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          <form onSubmit={handleSubmit} className={firebaseEnabled ? "space-y-3" : "mt-4 space-y-3"}>
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
                placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </label>

            {error !== null ? <p className="text-xs text-red-600">{error}</p> : null}

            <Button type="submit" variant="accent" className="w-full" disabled={!canSubmit}>
              {isBusy ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login")
              setError(null)
            }}
            className="mt-4 w-full text-center text-xs text-ink-secondary hover:text-ink-primary"
          >
            {mode === "login" ? "No account yet? Create one" : "Already have an account? Sign in"}
          </button>
        </Card>
      </div>
    </div>
  )
}
