import { Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Assessments } from "@/pages/Assessments"
import { Assistant } from "@/pages/Assistant"
import { Bookmarks } from "@/pages/Bookmarks"
import { Courses } from "@/pages/Courses"
import { Dashboard } from "@/pages/Dashboard"
import { Profile } from "@/pages/Profile"
import { Projects } from "@/pages/Projects"
import { Roadmap } from "@/pages/Roadmap"
import { Settings } from "@/pages/Settings"
import { SkillGraph } from "@/pages/SkillGraph"

export default function App() {
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
      </Routes>
    </AppShell>
  )
}
