import type { LearnerProfile } from "@/types"

export type AppNotification = {
  id: string
  title: string
  detail: string
  to: string
}

/**
 * Notifications are derived from real account and profile state until a
 * backend notification source exists. Nothing here is fabricated data.
 */
export function buildNotifications(
  email: string | null,
  profile: LearnerProfile | null,
): AppNotification[] {
  const items: AppNotification[] = []

  if (email !== null) {
    items.push({
      id: "welcome",
      title: "Welcome to Coursegram.ai",
      detail: "Your account is ready. Pick a target role to shape your path.",
      to: "/profile",
    })
  }

  if (profile !== null && profile.target_role_slug === null) {
    items.push({
      id: "target-role",
      title: "No target role set",
      detail: "Choose a roadmap track so recommendations match your goal.",
      to: "/profile",
    })
  }

  if (profile !== null && profile.background.trim() === "") {
    items.push({
      id: "background",
      title: "Add your background",
      detail: "A short description helps tailor course suggestions.",
      to: "/profile",
    })
  }

  return items
}

const READ_KEY = "coursegram.notifications.read.v1"

export function readDismissedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(READ_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function storeDismissedIds(ids: string[]): void {
  window.localStorage.setItem(READ_KEY, JSON.stringify(ids))
}
