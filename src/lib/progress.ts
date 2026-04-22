import type { App, AppStage } from "./db-types"
import type { ApprovalRow, MarketingChecklist } from "./db-types-extra"
import type { BlockerSeverity } from "./pipeline"
import { computeAppStatus } from "./pipeline"

/**
 * Derived per-app "progress object" used to paint the landing timeline.
 *
 * Each phase has:
 *  - `state`: "completed" if the app has moved past it; "active" if this
 *     is the app's current stage; "pending" otherwise.
 *  - `checks` (optional): ordered sub-checks with their individual state.
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
  /** Optional fuller name, shown in tooltips / detail. */
  title?: string
}

export type PhaseKey = "mvp" | "rfm" | "launched" | "mkt"

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
  ready_for_mainnet: 1,
  monetization_setup: 2,
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

  // --- MVP: single implicit check "app submitted".
  const mvpPhase: Phase = {
    key: "mvp",
    label: "MVP",
    state: phaseState(0),
    checks: [
      {
        id: "submitted",
        label: "Submitted",
        state: "done",
      },
    ],
  }

  // --- Ready for Mainnet: CTO, COO, Legal, Monetization setup ready
  const approvalByRole = new Map(
    input.approvals.map((a) => [a.approver_role, a.status])
  )
  const mapApproval = (
    role: "cto" | "coo" | "legal_lead"
  ): CheckState => {
    const s = approvalByRole.get(role)
    if (!s) return rank >= 1 ? "pending" : "not_started"
    if (s === "approved") return "approved"
    if (s === "rejected") return "rejected"
    return "pending"
  }
  const rfmPhase: Phase = {
    key: "rfm",
    label: "Ready for Mainnet",
    state: phaseState(1),
    checks: [
      {
        id: "cto",
        label: "Gustavo",
        title: "CTO approval",
        state: mapApproval("cto"),
      },
      {
        id: "coo",
        label: "Joaquín",
        title: "COO approval",
        state: mapApproval("coo"),
      },
      {
        id: "legal",
        label: "Legal",
        title: "Jonathan / Legal lead",
        state: mapApproval("legal_lead"),
      },
      {
        id: "monet",
        label: "Monet.",
        title: "Monetization setup ready",
        state: input.app.monetization_setup_complete
          ? "done"
          : rank >= 1
            ? "pending"
            : "not_started",
      },
    ],
  }

  // --- Launched on mainnet
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

  // --- MKT basic package
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
    phases: [mvpPhase, rfmPhase, launchedPhase, mktPhase],
  }
}

function phaseKeyForStage(stage: AppStage): PhaseKey {
  switch (stage) {
    case "mvp":
      return "mvp"
    case "ready_for_mainnet":
    case "monetization_setup":
      return "rfm"
    case "launched":
      return "launched"
    default:
      return "mkt"
  }
}
