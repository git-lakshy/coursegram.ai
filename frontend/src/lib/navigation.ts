import {
  Bookmark,
  BookOpen,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  Network,
  Route,
  Settings2,
  Sparkles,
  UserRound,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  label: string
  to: string
  icon: LucideIcon
}

export type NavSection = {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard },
      { label: "My Roadmap", to: "/roadmap", icon: Route },
      { label: "Courses", to: "/courses", icon: BookOpen },
      { label: "Projects", to: "/projects", icon: FolderKanban },
      { label: "Assessments", to: "/assessments", icon: ClipboardCheck },
    ],
  },
  {
    label: "Learning",
    items: [
      { label: "Skill Graph", to: "/skill-graph", icon: Network },
      { label: "AI Assistant", to: "/assistant", icon: Sparkles },
      { label: "Bookmarks", to: "/bookmarks", icon: Bookmark },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", to: "/profile", icon: UserRound },
      { label: "Settings", to: "/settings", icon: Settings2 },
    ],
  },
]
