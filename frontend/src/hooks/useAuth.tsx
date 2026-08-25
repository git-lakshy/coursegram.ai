import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"

import { getMe, getProfile, storeToken } from "@/lib/api"
import { firebaseAuth } from "@/lib/firebase"
import type { LearnerProfile } from "@/types"

type AuthState = {
  user: User | null
  token: string | null
  email: string | null
  profile: LearnerProfile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  setProfile: (profile: LearnerProfile) => void
}

const AuthContext = createContext<AuthState | null>(null)

const DEFAULT_PROFILE: LearnerProfile = {
  display_name: "",
  background: "",
  skill_level: "beginner",
  target_role_slug: null,
  known_topics: [],
  onboarding_complete: false,
  personalized_roadmap: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfileState] = useState<LearnerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  // Firebase is the single source of truth for the session.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser)
      if (nextUser === null) {
        setToken(null)
        setProfileState(null)
        storeToken(null)
      }
      setIsLoading(false)
    })
    // Keeps the backend token fresh; Firebase refreshes it about every hour.
    const unsubscribeToken = onIdTokenChanged(firebaseAuth, (nextUser) => {
      if (nextUser === null) {
        setToken(null)
        return
      }
      void nextUser.getIdToken().then((idToken) => {
        setToken(idToken)
        storeToken(idToken)
      })
    })
    return () => {
      unsubscribeAuth()
      unsubscribeToken()
    }
  }, [])

  // Make sure the backend knows the user, then load the profile.
  useEffect(() => {
    if (user === null || token === null) return
    let cancelled = false
    void (async () => {
      try {
        await getMe(token)
        if (cancelled) return
        try {
          setProfileState(await getProfile(token))
        } catch {
          setProfileState(DEFAULT_PROFILE)
        }
      } catch {
        // Backend unreachable or rejecting the token; leave profile empty.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, token])

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password)
  }, [])

  const loginWithGoogle = useCallback(async () => {
    await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
  }, [])

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
      if (displayName.trim() !== "") {
        await updateProfile(credential.user, { displayName: displayName.trim() })
      }
    },
    [],
  )

  const logout = useCallback(() => {
    void signOut(firebaseAuth)
    queryClient.clear()
  }, [queryClient])

  const setProfile = useCallback((next: LearnerProfile) => {
    setProfileState(next)
  }, [])

  const value = useMemo(
    () => ({ user, token, email: user?.email ?? null, profile, isLoading, login, loginWithGoogle, register, logout, setProfile }),
    [user, token, profile, isLoading, login, register, logout, setProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}
