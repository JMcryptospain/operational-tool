import type { App, AppStage } from "./db-types"
import type { ApprovalRow, MarketingChecklist } from "./db-types-extra"
import type { BlockerSeverity } from "./pipeline"
import { computeAppStatus } from "./pipeline"

/**
 * Per-app "progress object" used to paint the landing timeline and the
 * detail page. Five phases, left to right:
 *
 *   1. MVP                 — PM submits the app
 *   2. Refining & Legal    — Owner confirms readiness, Jonathan signs off
 *                            on legal + monetization operational wiring
 *   3. Ready for Mainnet   — Gustavo + Joaquín approve the launch (48h)
 *   4. Launched            — App is live on mainnet
 *   5. MKT Basic           — Tweet / Proving Ground article / Video
 */

export type PhaseState = "completed" | "active" | "pending"
export type CheckState =
  | "not_started"
  | "pending"
  | "approved"
  | "rejected"
  | "vetoed"
  | "done"

export type Check = {
  id: string
  label: string
  state: CheckState
  title?: string
}

export type PhaseKey = "mvp" | "refining" | "rfm" | "launched" | "mkt"

export type Phase = {
  key: PhaseKey
  label: string
  state: PhaseState
  checks: Check[]
}

export type AppProgress = {
  severity: BlockerSeverity
  daysInStage: number
  currentPhase: PhaseKey | "review" | "terminal"
  phases: Phase[]
}

/** Order used to compare "past" vs "future" vs "current" phase. */
const STAGE_RANK: Record<AppStage, number> = {
  mvp: 0,
  refining: 1,
  ready_for_mainnet: 2,
  monetization_setup: 3,
  launched: 3,
  review: 4,
  active: 4,
  maintain_only: 4,
  killed: 4,
}

export function computeAppProgress(input: {
  app: Pick<
    App,
    | "current_stage"
    | "stage_entered_at"
    | "monetization_setup_complete"
    | "owner_tested_at"
  >
  approvals: ApprovalRow[]
  marketing: MarketingChecklist | null
  pmName: string | null
}): AppProgress {
  const status = computeAppStatus({
    current_stage: input.app.current_stage,
    stage_entered_at: input.app.stage_entered_at,
    pm: input.pmName ? { full_name: input.pmName, email: "" } : null,
  })

  const rank = STAGE_RANK[input.app.current_stage]
  const phaseState = (cutoff: number): PhaseState => {
    if (rank > cutoff) return "completed"
    if (rank === cutoff) return "active"
    return "pending"
  }

  const approvalByRole = new Map(
    input.approvals.map((a) => [a.approver_role, a.status])
  )
  const approvalCheck = (
    role: "cto" | "coo" | "legal_lead",
    minRank: number
  ): CheckState => {
    const s = approvalByRole.get(role)
    if (!s) return rank >= minRank ? "pending" : "not_started"
    if (s === "approved") return "approved"
    if (s === "rejected") return "rejected"
    return "pending"
  }

  // --- 1. MVP
  const mvpPhase: Phase = {
    key: "mvp",
    label: "MVP",
    state: phaseState(0),
    checks: [{ id: "submitted", label: "Submitted", state: "done" }],
  }

  // --- 2. Refining & Legal
  const ownerTested: CheckState = input.app.owner_tested_at
    ? "done"
    : rank >= 1
      ? "pending"
      : "not_started"
  const refiningPhase: Phase = {
    key: "refining",
    label: "Refining & Legal",
    state: phaseState(1),
    checks: [
      {
        id: "owner_tested",
        label: "Owner tested",
        title: "Owner has tested end-to-end",
        state: ownerTested,
      },
      {
        id: "legal",
        label: "Legal",
        title: "Jonathan · High-level legal review",
        state: approvalCheck("legal_lead", 1),
      },
      {
        id: "monet",
        label: "Monet. operative",
        title: "Monetization operationally ready",
        state: input.app.monetization_setup_complete
          ? "done"
          : rank >= 1
            ? "pending"
            : "not_started",
      },
    ],
  }

  // --- 3. Ready for Mainnet
  const rfmPhase: Phase = {
    key: "rfm",
    label: "Ready for Mainnet",
    state: phaseState(2),
    checks: [
      {
        id: "cto",
        label: "Gustavo",
        title: "CTO approval",
        state: approvalCheck("cto", 2),
      },
      {
        id: "coo",
        label: "Joaquín",
        title: "COO approval",
        state: approvalCheck("coo", 2),
      },
    ],
  }

  // --- 4. Launched
  const launchedPhase: Phase = {
    key: "launched",
    label: "Launched",
    state: phaseState(3),
    checks: [
      {
        id: "live",
        label: "Live",
        state: rank >= 3 ? "done" : rank === 2 ? "pending" : "not_started",
      },
    ],
  }

  // --- 5. MKT basic
  const mkt = input.marketing
  const mktCheckState = (flag: boolean): CheckState =>
    flag ? "done" : rank >= 3 ? "pending" : "not_started"

  const mktPhase: Phase = {
    key: "mkt",
    label: "MKT Basic",
    state:
      mkt && mkt.promoted_tweet && mkt.proving_ground_article && mkt.video
        ? "completed"
        : rank >= 3
          ? "active"
          : "pending",
    checks: [
      {
        id: "tweet",
        label: "Tweet",
        title: "Promoted tweet",
        state: mktCheckState(mkt?.promoted_tweet ?? false),
      },
      {
        id: "article",
        label: "Article",
        title: "Article on Proving Ground",
        state: mktCheckState(mkt?.proving_ground_article ?? false),
      },
      {
        id: "video",
        label: "Video",
        state: mktCheckState(mkt?.video ?? false),
      },
    ],
  }

  const currentPhase: AppProgress["currentPhase"] =
    input.app.current_stage === "review"
      ? "review"
      : input.app.current_stage === "active" ||
          input.app.current_stage === "maintain_only" ||
          input.app.current_stage === "killed"
        ? "terminal"
        : phaseKeyForStage(input.app.current_stage)

  return {
    severity: status.severity,
    daysInStage: status.daysInStage,
    currentPhase,
    phases: [mvpPhase, refiningPhase, rfmPhase, launchedPhase, mktPhase],
  }
}

function phaseKeyForStage(stage: AppStage): PhaseKey {
  switch (stage) {
    case "mvp":
      return "mvp"
    case "refining":
      return "refining"
    case "ready_for_mainnet":
      return "rfm"
    case "monetization_setup":
    case "launched":
      return "launched"
    default:
      return "mkt"
  }
}
