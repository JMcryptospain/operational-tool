import type { AppStage, MonetizationModel } from "./db-types"

export const STAGE_LABELS: Record<AppStage, string> = {
  mvp: "MVP",
  ready_for_mainnet: "Ready for Mainnet",
  monetization_setup: "Monetization Setup",
  launched: "Launched",
  review: "60-day Review",
  active: "Active",
  maintain_only: "Maintain Only",
  killed: "Killed",
}

/**
 * Tailwind classes for a stage badge. Kept in a single place so the pipeline
 * looks consistent across the dashboard and detail pages.
 */
export const STAGE_BADGE_CLASSES: Record<AppStage, string> = {
  mvp: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  ready_for_mainnet:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  monetization_setup:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  launched:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  review:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  maintain_only:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  killed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
}

export const MONETIZATION_LABELS: Record<MonetizationModel, string> = {
  free_for_now: "Free for now",
  crypto: "Pay with crypto",
  fiat_stripe: "Pay with FIAT (Stripe)",
  hybrid: "Hybrid",
}

/**
 * Days the app has been in its current stage. Used for the MVP timer
 * (2 weeks = orange warning, 4 weeks = red danger).
 */
export function daysInStage(stageEnteredAt: string): number {
  const entered = new Date(stageEnteredAt).getTime()
  const now = Date.now()
  return Math.floor((now - entered) / (1000 * 60 * 60 * 24))
}

export type MvpTimerLevel = "ok" | "warning" | "danger"

export function mvpTimerLevel(days: number): MvpTimerLevel {
  if (days >= 28) return "danger"
  if (days >= 14) return "warning"
  return "ok"
}
