import type { App, AppStage, Profile } from "./db-types"

/**
 * Per-app status derived from the current stage and the 48h-business-hours
 * Ready-for-Mainnet timer. Other phases do not carry their own deadline in
 * this version — we consider them "watching" regardless of time spent.
 */

export type BlockerSeverity = "idle" | "watching" | "warning" | "blocked"

export type AppStatus = {
  severity: BlockerSeverity
  daysInStage: number
  reason: string
  blockers: string[]
}

type StatusInput = Pick<App, "current_stage" | "stage_entered_at"> & {
  pm: Pick<Profile, "full_name" | "email"> | null
}

export function computeAppStatus(app: StatusInput): AppStatus {
  const now = new Date()
  const entered = new Date(app.stage_entered_at)
  const days = daysBetween(entered, now)

  switch (app.current_stage) {
    case "ready_for_mainnet": {
      const businessHours = businessHoursBetween(entered, now)
      if (businessHours >= 48) {
        return {
          severity: "blocked",
          daysInStage: days,
          reason: "48h approval window expired",
          blockers: ["CTO", "COO", "Legal Lead"],
        }
      }
      return {
        severity: "warning",
        daysInStage: days,
        reason: "Awaiting approvals",
        blockers: ["CTO", "COO", "Legal Lead"],
      }
    }

    case "mvp":
    case "monetization_setup":
    case "launched":
    case "review":
      return {
        severity: "watching",
        daysInStage: days,
        reason: STAGE_REASON[app.current_stage],
        blockers: [],
      }

    case "active":
    case "maintain_only":
    case "killed":
      return {
        severity: "idle",
        daysInStage: days,
        reason: STAGE_REASON[app.current_stage],
        blockers: [],
      }
  }
}

const STAGE_REASON: Record<AppStage, string> = {
  mvp: "Building",
  ready_for_mainnet: "Awaiting approvals",
  monetization_setup: "Wiring payments",
  launched: "Live",
  review: "Review decision pending",
  active: "Active",
  maintain_only: "Maintain only",
  killed: "Killed",
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Business hours between two moments in Europe/Madrid. Weekends are
 * skipped; inside a workday every hour counts. We treat whole days as 24h
 * of "business time" to keep the formula simple — the spec talks about
 * 48h = "2 working days".
 */
export function businessHoursBetween(start: Date, end: Date): number {
  if (end <= start) return 0
  // Work in the Madrid day-of-week to avoid timezone drift.
  const tz = "Europe/Madrid"
  const dayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  })
  let cursor = new Date(start)
  let hours = 0
  const msPerHour = 1000 * 60 * 60
  const total = Math.ceil((end.getTime() - start.getTime()) / msPerHour)
  for (let i = 0; i < total; i++) {
    const day = dayFmt.format(cursor)
    if (day !== "Sat" && day !== "Sun") hours += 1
    cursor = new Date(cursor.getTime() + msPerHour)
  }
  return hours
}

export const SEVERITY_ORDER: BlockerSeverity[] = [
  "blocked",
  "warning",
  "watching",
  "idle",
]

export function compareSeverity(a: BlockerSeverity, b: BlockerSeverity) {
  return SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b)
}

export const PIPELINE_STAGES: AppStage[] = [
  "mvp",
  "ready_for_mainnet",
  "monetization_setup",
  "launched",
  "review",
]

export const TERMINAL_STAGES: AppStage[] = [
  "active",
  "maintain_only",
  "killed",
]
