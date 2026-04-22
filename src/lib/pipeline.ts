import type { App, AppStage, Profile } from "./db-types"

/**
 * Derived, per-app status used across the dashboard and detail page.
 *
 * `blockers` is a list of human-readable names who are currently expected to
 * act. If empty, the app is waiting on its owner or on automated gates. The
 * UI prints these names verbatim.
 *
 * `severity`:
 *  - "idle": no action required right now (e.g. Launched & fresh)
 *  - "watching": acceptable wait (e.g. MVP < 2 weeks, RFM within 48h)
 *  - "warning": approaching a deadline / 2+ weeks in MVP / final day of
 *     the 48h window
 *  - "blocked": past the deadline (MVP > 4 weeks, RFM past 48h, review
 *     overdue, etc.)
 */

export type BlockerSeverity = "idle" | "watching" | "warning" | "blocked"

export type AppStatus = {
  severity: BlockerSeverity
  /** Days the app has been in its current stage. */
  daysInStage: number
  /** Short label for why this is blocked/stale. Empty string if idle. */
  reason: string
  /** People (names/emails) whose action is needed. May be empty. */
  blockers: string[]
}

type StatusInput = Pick<App, "current_stage" | "stage_entered_at"> & {
  pm: Pick<Profile, "full_name" | "email"> | null
}

export function computeAppStatus(app: StatusInput): AppStatus {
  const days = daysBetween(new Date(app.stage_entered_at), new Date())

  switch (app.current_stage) {
    case "mvp":
      return mvpStatus(days, app.pm)

    case "ready_for_mainnet":
      // TODO(next milestone): include approval state (CTO/COO/Legal) to list
      // who hasn't signed off. For now, show the window timer only.
      return rfmStatus(days, app.pm)

    case "monetization_setup":
      return monetizationStatus(days, app.pm)

    case "launched":
      return {
        severity: "idle",
        daysInStage: days,
        reason: "Launched",
        blockers: [],
      }

    case "review":
      return reviewStatus(days)

    case "active":
    case "maintain_only":
      return {
        severity: "idle",
        daysInStage: days,
        reason: app.current_stage === "active" ? "Active" : "Maintain only",
        blockers: [],
      }

    case "killed":
      return {
        severity: "idle",
        daysInStage: days,
        reason: "Killed",
        blockers: [],
      }
  }
}

function mvpStatus(
  days: number,
  pm: StatusInput["pm"]
): AppStatus {
  const pmName = pm?.full_name ?? pm?.email ?? "PM"
  if (days >= 28) {
    return {
      severity: "blocked",
      daysInStage: days,
      reason: `${days}d in MVP — decide to promote or drop`,
      blockers: [pmName],
    }
  }
  if (days >= 14) {
    return {
      severity: "warning",
      daysInStage: days,
      reason: `${days}d in MVP — getting stale`,
      blockers: [pmName],
    }
  }
  return {
    severity: "watching",
    daysInStage: days,
    reason: `${days}d in MVP`,
    blockers: [],
  }
}

function rfmStatus(days: number, _pm: StatusInput["pm"]): AppStatus {
  // We'll wire the real 48h business-hour timer + named approvers in the
  // Ready-for-Mainnet milestone. Until then, the approvers are generic
  // role labels and we use elapsed days as a coarse proxy.
  if (days >= 3) {
    return {
      severity: "blocked",
      daysInStage: days,
      reason: "Approval window expired",
      blockers: ["CTO", "COO", "Legal Lead"],
    }
  }
  if (days >= 2) {
    return {
      severity: "warning",
      daysInStage: days,
      reason: "Approvers have < 24h left",
      blockers: ["CTO", "COO", "Legal Lead"],
    }
  }
  return {
    severity: "watching",
    daysInStage: days,
    reason: "Awaiting approvals",
    blockers: ["CTO", "COO", "Legal Lead"],
  }
}

function monetizationStatus(
  days: number,
  pm: StatusInput["pm"]
): AppStatus {
  const pmName = pm?.full_name ?? pm?.email ?? "PM"
  if (days >= 10) {
    return {
      severity: "blocked",
      daysInStage: days,
      reason: "Payments setup overdue",
      blockers: [pmName, "Jonathan"],
    }
  }
  return {
    severity: "watching",
    daysInStage: days,
    reason: "Wiring payments",
    blockers: [pmName, "Jonathan"],
  }
}

function reviewStatus(days: number): AppStatus {
  if (days >= 7) {
    return {
      severity: "blocked",
      daysInStage: days,
      reason: "60-day review overdue",
      blockers: ["PM", "COO"],
    }
  }
  return {
    severity: "watching",
    daysInStage: days,
    reason: "Decide Active / Maintain / Kill",
    blockers: ["PM", "COO"],
  }
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export const SEVERITY_ORDER: BlockerSeverity[] = [
  "blocked",
  "warning",
  "watching",
  "idle",
]

/** Sort so the most urgent apps bubble to the top. */
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
