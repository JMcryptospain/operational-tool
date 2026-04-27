import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { computeAppProgress } from "./progress"
import type { ApprovalRow, MarketingChecklist } from "./db-types-extra"
import type { App } from "./db-types"

/**
 * Tests for the per-app phase computation: makes sure every check
 * surfaces the right state (done / pending / approved / not_started),
 * the parent phase's state is consistent with its checks, and a veto
 * short-circuits the severity to "blocked".
 */

type AppFixture = Pick<
  App,
  | "current_stage"
  | "stage_entered_at"
  | "created_at"
  | "monetization_setup_complete"
  | "owner_tested_at"
  | "launched_at"
  | "analytics_wired_at"
  | "vetoed_at"
>

const baseApp = (overrides: Partial<AppFixture> = {}): AppFixture => ({
  current_stage: "mvp",
  stage_entered_at: "2026-05-15T12:00:00Z",
  created_at: "2026-05-15T12:00:00Z",
  monetization_setup_complete: false,
  owner_tested_at: null,
  launched_at: null,
  analytics_wired_at: null,
  vetoed_at: null,
  ...overrides,
})

const approvedBy = (
  role: "cto" | "coo" | "legal_lead"
): ApprovalRow => ({ approver_role: role, status: "approved" })

const blankMkt = (): MarketingChecklist => ({
  id: "mkt-1",
  app_id: "app-1",
  promoted_tweet: false,
  proving_ground_article: false,
  video: false,
  ai_product_listings: false,
  media_pitch: false,
  completed_at: null,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-05-15T13:00:00Z"))
})
afterEach(() => vi.useRealTimers())

const findCheck = (
  phases: ReturnType<typeof computeAppProgress>["phases"],
  phaseKey: string,
  checkId: string
) =>
  phases.find((p) => p.key === phaseKey)?.checks.find((c) => c.id === checkId)

const findPhase = (
  phases: ReturnType<typeof computeAppProgress>["phases"],
  key: string
) => phases.find((p) => p.key === key)!

describe("computeAppProgress — phase shape", () => {
  it("emits five phases in canonical order", () => {
    const r = computeAppProgress({
      app: baseApp(),
      approvals: [],
      marketing: null,
      pmName: "Owner",
    })
    expect(r.phases.map((p) => p.key)).toEqual([
      "mvp",
      "refining",
      "rfm",
      "launched",
      "mkt",
    ])
  })

  it("MVP is always done with the single 'submitted' check", () => {
    const r = computeAppProgress({
      app: baseApp(),
      approvals: [],
      marketing: null,
      pmName: "Owner",
    })
    const mvp = findPhase(r.phases, "mvp")
    expect(mvp.checks).toHaveLength(1)
    expect(mvp.checks[0].state).toBe("done")
  })
})

describe("computeAppProgress — Refining checks", () => {
  it("everything pending while in Refining with no checks done", () => {
    const r = computeAppProgress({
      app: baseApp({ current_stage: "refining" }),
      approvals: [],
      marketing: null,
      pmName: "Owner",
    })
    expect(findCheck(r.phases, "refining", "owner_tested")?.state).toBe(
      "pending"
    )
    expect(findCheck(r.phases, "refining", "legal")?.state).toBe("pending")
    expect(findCheck(r.phases, "refining", "monet")?.state).toBe("pending")
    expect(findCheck(r.phases, "refining", "analytics")?.state).toBe(
      "pending"
    )
  })

  it("owner_tested flips to done when stamped", () => {
    const r = computeAppProgress({
      app: baseApp({
        current_stage: "refining",
        owner_tested_at: "2026-05-15T13:00:00Z",
      }),
      approvals: [],
      marketing: null,
      pmName: "Owner",
    })
    expect(findCheck(r.phases, "refining", "owner_tested")?.state).toBe(
      "done"
    )
  })

  it("legal flips to approved when Jonathan signs off", () => {
    const r = computeAppProgress({
      app: baseApp({ current_stage: "refining" }),
      approvals: [approvedBy("legal_lead")],
      marketing: null,
      pmName: "Owner",
    })
    expect(findCheck(r.phases, "refining", "legal")?.state).toBe("approved")
  })

  it("monet flips when monetization_setup_complete is true", () => {
    const r = computeAppProgress({
      app: baseApp({
        current_stage: "refining",
        monetization_setup_complete: true,
      }),
      approvals: [],
      marketing: null,
      pmName: "Owner",
    })
    expect(findCheck(r.phases, "refining", "monet")?.state).toBe("done")
  })

  it("analytics flips when analytics_wired_at is stamped", () => {
    const r = computeAppProgress({
      app: baseApp({
        current_stage: "refining",
        analytics_wired_at: "2026-05-15T13:00:00Z",
      }),
      approvals: [],
      marketing: null,
      pmName: "Owner",
    })
    expect(findCheck(r.phases, "refining", "analytics")?.state).toBe("done")
  })
})

describe("computeAppProgress — Ready for Mainnet", () => {
  it("CTO + COO checks reflect approval state", () => {
    const r = computeAppProgress({
      app: baseApp({ current_stage: "ready_for_mainnet" }),
      approvals: [approvedBy("cto")],
      marketing: null,
      pmName: "Owner",
    })
    expect(findCheck(r.phases, "rfm", "cto")?.state).toBe("approved")
    expect(findCheck(r.phases, "rfm", "coo")?.state).toBe("pending")
  })
})

describe("computeAppProgress — Launched & MKT", () => {
  it("Launched phase is 'active' before launched_at, 'completed' after", () => {
    const before = computeAppProgress({
      app: baseApp({ current_stage: "launched", launched_at: null }),
      approvals: [],
      marketing: null,
      pmName: "Owner",
    })
    const after = computeAppProgress({
      app: baseApp({
        current_stage: "launched",
        launched_at: "2026-05-15T13:00:00Z",
      }),
      approvals: [],
      marketing: null,
      pmName: "Owner",
    })
    expect(findPhase(before.phases, "launched").state).toBe("active")
    expect(findPhase(after.phases, "launched").state).toBe("completed")
  })

  it("MKT checks stay 'not_started' until launched_at is set", () => {
    const r = computeAppProgress({
      app: baseApp({ current_stage: "launched", launched_at: null }),
      approvals: [],
      marketing: blankMkt(),
      pmName: "Owner",
    })
    expect(findCheck(r.phases, "mkt", "tweet")?.state).toBe("not_started")
  })

  it("MKT checks become 'pending' once live, then 'done' as Tiffany ticks them", () => {
    const r = computeAppProgress({
      app: baseApp({
        current_stage: "launched",
        launched_at: "2026-05-15T13:00:00Z",
      }),
      approvals: [],
      marketing: { ...blankMkt(), promoted_tweet: true },
      pmName: "Owner",
    })
    expect(findCheck(r.phases, "mkt", "tweet")?.state).toBe("done")
    expect(findCheck(r.phases, "mkt", "video")?.state).toBe("pending")
  })

  it("MKT phase becomes 'completed' only when all 5 are done", () => {
    const r = computeAppProgress({
      app: baseApp({
        current_stage: "launched",
        launched_at: "2026-05-15T13:00:00Z",
      }),
      approvals: [],
      marketing: {
        ...blankMkt(),
        promoted_tweet: true,
        proving_ground_article: true,
        video: true,
        ai_product_listings: true,
        media_pitch: true,
      },
      pmName: "Owner",
    })
    expect(findPhase(r.phases, "mkt").state).toBe("completed")
  })
})

describe("computeAppProgress — veto short-circuits severity", () => {
  it("vetoed app is reported as blocked regardless of timer", () => {
    const r = computeAppProgress({
      app: baseApp({
        current_stage: "refining",
        vetoed_at: "2026-05-15T12:30:00Z",
      }),
      approvals: [],
      marketing: null,
      pmName: "Owner",
    })
    expect(r.severity).toBe("blocked")
  })
})
