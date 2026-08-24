import { Route, Routes, Navigate } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Assessments } from "@/pages/Assessments"
import { Assistant } from "@/pages/Assistant"
import { Bookmarks } from "@/pages/Bookmarks"
import { Courses } from "@/pages/Courses"
import { Dashboard } from "@/pages/Dashboard"
import { Login } from "@/pages/Login"
import { Profile } from "@/pages/Profile"
import { Projects } from "@/pages/Projects"
import { Roadmap } from "@/pages/Roadmap"
import { Settings } from "@/pages/Settings"
import { SkillGraph } from "@/pages/SkillGraph"
import { AuthProvider, useAuth } from "@/hooks/useAuth"
import type { ReactNode } from "react"

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-ink-muted">Loading...</p>
      </div>
    )
  }
  if (token === null) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AuthedRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/assessments" element={<Assessments />} />
        <Route path="/skill-graph" element={<SkillGraph />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="*"
          element={
            <RequireAuth>
              <AuthedRoutes />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
