import type { App, AppStage, Profile } from "./db-types"

/**
 * Per-app status derived from the current stage and the 48h-business-hours
 * Ready-for-Mainnet timer. Other phases do not carry their own deadline in
 * this version — we consider them "watching" regardless of time spent.
 */

export type BlockerSeverity = "idle" | "watching" | "warning" | "blocked"

/**
 * Visible countdown attached to an app's current stage. Rendered in the
 * landing table and the detail header so every viewer understands what the
 * deadline is for.
 *
 *  - "build"  — from first day in MVP until entering Ready for Mainnet.
 *               10-day budget. Warning at 7d, overdue at 10d.
 *  - "review" — 48 business hours in Ready for Mainnet for Gustavo & Joaquín
 *               to approve. Warning at 36h, overdue at 48h.
 */
export type Timer = {
  kind: "build" | "review"
  label: string
  elapsed: number
  budget: number
  unit: "days" | "hours"
  severity: BlockerSeverity
  /** Positive if time left, negative if overdue. */
  remaining: number
}

export type AppStatus = {
  severity: BlockerSeverity
  daysInStage: number
  reason: string
  blockers: string[]
  timer: Timer | null
}

type StatusInput = Pick<
  App,
  "current_stage" | "stage_entered_at" | "created_at"
> & {
  pm: Pick<Profile, "full_name" | "email"> | null
}

const BUILD_BUDGET_DAYS = 10
const BUILD_WARN_DAYS = 7
const REVIEW_BUDGET_HOURS = 48
const REVIEW_WARN_HOURS = 36

export function computeAppStatus(app: StatusInput): AppStatus {
  const now = new Date()
  const enteredStage = new Date(app.stage_entered_at)
  const created = new Date(app.created_at ?? app.stage_entered_at)
  const days = daysBetween(enteredStage, now)

  switch (app.current_stage) {
    case "mvp":
    case "refining": {
      // 10-day build window runs continuously from app creation
      const buildDays = daysBetween(created, now)
      const timerSev: BlockerSeverity =
        buildDays >= BUILD_BUDGET_DAYS
          ? "blocked"
          : buildDays >= BUILD_WARN_DAYS
            ? "warning"
            : "watching"
      return {
        severity: timerSev,
        daysInStage: days,
        reason:
          timerSev === "blocked"
            ? "Build window expired (10d)"
            : timerSev === "warning"
              ? "Build window closing (>7d)"
              : STAGE_REASON[app.current_stage],
        blockers: timerSev === "blocked" ? ["Owner / PM"] : [],
        timer: {
          kind: "build",
          label: "Build window",
          elapsed: buildDays,
          budget: BUILD_BUDGET_DAYS,
          unit: "days",
          severity: timerSev,
          remaining: BUILD_BUDGET_DAYS - buildDays,
        },
      }
    }

    case "ready_for_mainnet": {
      const businessHours = businessHoursBetween(enteredStage, now)
      const timerSev: BlockerSeverity =
        businessHours >= REVIEW_BUDGET_HOURS
          ? "blocked"
          : businessHours >= REVIEW_WARN_HOURS
            ? "warning"
            : "watching"
      return {
        severity: timerSev,
        daysInStage: days,
        reason:
          timerSev === "blocked"
            ? "48h review window expired"
            : timerSev === "warning"
              ? "Review window closing (<12h)"
              : "Awaiting approvals",
        blockers: ["CTO", "COO"],
        timer: {
          kind: "review",
          label: "Review window",
          elapsed: businessHours,
          budget: REVIEW_BUDGET_HOURS,
          unit: "hours",
          severity: timerSev,
          remaining: REVIEW_BUDGET_HOURS - businessHours,
        },
      }
    }

    case "monetization_setup":
    case "launched":
    case "review":
      return {
        severity: "watching",
        daysInStage: days,
        reason: STAGE_REASON[app.current_stage],
        blockers: [],
        timer: null,
      }

    case "active":
    case "maintain_only":
    case "killed":
      return {
        severity: "idle",
        daysInStage: days,
        reason: STAGE_REASON[app.current_stage],
        blockers: [],
        timer: null,
      }
  }
}

const STAGE_REASON: Record<AppStage, string> = {
  mvp: "Building",
  refining: "Refining & legal review",
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
  "refining",
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
