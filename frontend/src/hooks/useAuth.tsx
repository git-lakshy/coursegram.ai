import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth"

import {
  getMe,
  getProfile,
  login as apiLogin,
  readToken,
  register as apiRegister,
  storeToken,
} from "@/lib/api"
import { firebaseAuth, firebaseEnabled } from "@/lib/firebase"
import type { LearnerProfile } from "@/types"

type AuthState = {
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
  const [token, setToken] = useState<string | null>(() => readToken())
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfileState] = useState<LearnerProfile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(token !== null)
  const queryClient = useQueryClient()

  const applySession = useCallback(async (newToken: string) => {
    const me = await getMe(newToken)
    setToken(newToken)
    setEmail(me.email)
    storeToken(newToken)
    try {
      setProfileState(await getProfile(newToken))
    } catch {
      setProfileState(DEFAULT_PROFILE)
    }
  }, [])

  useEffect(() => {
    if (token === null) {
      setIsLoading(false)
      return
    }
    applySession(token)
      .catch(() => {
        storeToken(null)
        setToken(null)
        setEmail(null)
        setProfileState(null)
      })
      .finally(() => setIsLoading(false))
  }, [token, applySession])

  const login = useCallback(
    async (userEmail: string, password: string) => {
      if (firebaseEnabled && firebaseAuth) {
        const credential = await signInWithEmailAndPassword(firebaseAuth, userEmail, password)
        await applySession(await credential.user.getIdToken())
        return
      }
      const response = await apiLogin(userEmail, password)
      await applySession(response.access_token)
    },
    [applySession],
  )

  const loginWithGoogle = useCallback(async () => {
    if (!firebaseEnabled || !firebaseAuth) {
      throw new Error("Google sign in is not configured")
    }
    const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
    await applySession(await credential.user.getIdToken())
  }, [applySession])

  const register = useCallback(
    async (userEmail: string, password: string, displayName: string) => {
      if (firebaseEnabled && firebaseAuth) {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, userEmail, password)
        if (displayName.trim() !== "") {
          await updateProfile(credential.user, { displayName: displayName.trim() })
        }
        await applySession(await credential.user.getIdToken())
        return
      }
      const response = await apiRegister(userEmail, password, displayName)
      await applySession(response.access_token)
    },
    [applySession],
  )

  const logout = useCallback(() => {
    if (firebaseEnabled && firebaseAuth) {
      void signOut(firebaseAuth)
    }
    storeToken(null)
    setToken(null)
    setEmail(null)
    setProfileState(null)
    queryClient.clear()
  }, [queryClient])

  const setProfile = useCallback((next: LearnerProfile) => {
    setProfileState(next)
  }, [])

  const value = useMemo(
    () => ({ token, email, profile, isLoading, login, loginWithGoogle, register, logout, setProfile }),
    [token, email, profile, isLoading, login, register, logout, setProfile],
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

