import { lazy, Suspense } from "react"
import type { ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthProvider, useAuth } from "@/hooks/useAuth"

const Assessments = lazy(() => import("@/pages/Assessments").then((m) => ({ default: m.Assessments })))
const Assistant = lazy(() => import("@/pages/Assistant").then((m) => ({ default: m.Assistant })))
const Bookmarks = lazy(() => import("@/pages/Bookmarks").then((m) => ({ default: m.Bookmarks })))
const Courses = lazy(() => import("@/pages/Courses").then((m) => ({ default: m.Courses })))
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })))
const Login = lazy(() => import("@/pages/Login").then((m) => ({ default: m.Login })))
const Onboarding = lazy(() => import("@/pages/Onboarding").then((m) => ({ default: m.Onboarding })))
const Profile = lazy(() => import("@/pages/Profile").then((m) => ({ default: m.Profile })))
const Projects = lazy(() => import("@/pages/Projects").then((m) => ({ default: m.Projects })))
const Roadmap = lazy(() => import("@/pages/Roadmap").then((m) => ({ default: m.Roadmap })))
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })))
const SkillGraph = lazy(() => import("@/pages/SkillGraph").then((m) => ({ default: m.SkillGraph })))

function PageFallback() {
  return (
    <div className="mx-auto max-w-5xl space-y-3 px-4 py-5">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, profile, isLoading } = useAuth()
  if (isLoading) {
    return <PageFallback />
  }
  if (token === null) {
    return <Navigate to="/login" replace />
  }
  if (profile !== null && !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

function AuthedRoutes() {
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
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
