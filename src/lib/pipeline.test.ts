import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  businessHoursBetween,
  computeAppStatus,
  daysBetween,
} from "./pipeline"

/**
 * `pipeline.ts` is one of the few modules whose correctness directly
 * affects what the dashboard says is "blocked" or not, so the tests
 * here are deliberately exhaustive on the timer math.
 */

const isoOf = (yyyy: number, mm: number, dd: number, hh = 0, mi = 0) =>
  new Date(Date.UTC(yyyy, mm - 1, dd, hh, mi)).toISOString()

describe("daysBetween", () => {
  it("returns 0 for the same instant", () => {
    const t = new Date("2026-01-01T00:00:00Z")
    expect(daysBetween(t, t)).toBe(0)
  })

  it("returns whole days", () => {
    expect(
      daysBetween(
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-04T00:00:00Z")
      )
    ).toBe(3)
  })

  it("floors partial days", () => {
    expect(
      daysBetween(
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-04T23:59:00Z")
      )
    ).toBe(3)
  })
})

describe("businessHoursBetween (Madrid weekdays)", () => {
  it("counts every weekday hour as a business hour", () => {
    // Monday 10:00 -> Monday 14:00, all four hours weekday
    const a = new Date("2026-04-27T10:00:00Z") // Mon
    const b = new Date("2026-04-27T14:00:00Z")
    expect(businessHoursBetween(a, b)).toBeGreaterThanOrEqual(4)
  })

  it("returns 0 when end <= start", () => {
    const t = new Date("2026-04-27T10:00:00Z")
    expect(businessHoursBetween(t, t)).toBe(0)
    expect(
      businessHoursBetween(
        new Date("2026-04-27T11:00:00Z"),
        new Date("2026-04-27T10:00:00Z")
      )
    ).toBe(0)
  })

  it("excludes Saturday and Sunday hours", () => {
    // Friday 23:00 UTC -> Monday 01:00 UTC = ~50 wall hours, but only
    // a thin sliver are weekdays in Madrid, so this should be < 50.
    const fri = new Date("2026-04-24T23:00:00Z") // Fri 23:00 UTC
    const mon = new Date("2026-04-27T01:00:00Z") // Mon 01:00 UTC
    const result = businessHoursBetween(fri, mon)
    expect(result).toBeLessThan(50)
    expect(result).toBeGreaterThan(0)
  })

  it("returns 0 across a pure weekend", () => {
    // Sat 00:00 -> Sun 23:00 in Madrid is the same in UTC at this
    // time of year (both UTC and Madrid are within DST tolerance).
    const sat = new Date("2026-04-25T01:00:00Z") // Sat 03:00 Madrid (DST)
    const sun = new Date("2026-04-26T22:00:00Z") // Sun 00:00 Madrid (DST)
    expect(businessHoursBetween(sat, sun)).toBe(0)
  })
})

/* ------------------------------------------------------------------ */
/* computeAppStatus                                                   */
/* ------------------------------------------------------------------ */

const PM = { full_name: "Owner", email: "owner@taiko.xyz" }

describe("computeAppStatus — MVP / Refining build window", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-15T12:00:00Z"))
  })
  afterEach(() => vi.useRealTimers())

  it("is 'watching' inside the 7-day budget", () => {
    const s = computeAppStatus({
      current_stage: "mvp",
      stage_entered_at: isoOf(2026, 5, 14, 12),
      created_at: isoOf(2026, 5, 14, 12),
      pm: PM,
    })
    expect(s.severity).toBe("watching")
    expect(s.timer?.kind).toBe("build")
    expect(s.timer?.elapsed).toBe(1)
    expect(s.timer?.remaining).toBe(9)
  })

  it("is 'warning' between 7 and 10 days", () => {
    const s = computeAppStatus({
      current_stage: "refining",
      stage_entered_at: isoOf(2026, 5, 7, 12),
      created_at: isoOf(2026, 5, 7, 12),
      pm: PM,
    })
    expect(s.severity).toBe("warning")
    expect(s.timer?.elapsed).toBe(8)
  })

  it("is 'blocked' once the 10-day budget is exhausted", () => {
    const s = computeAppStatus({
      current_stage: "refining",
      stage_entered_at: isoOf(2026, 5, 1, 12),
      created_at: isoOf(2026, 5, 1, 12),
      pm: PM,
    })
    expect(s.severity).toBe("blocked")
    expect(s.timer?.severity).toBe("blocked")
    expect(s.reason).toMatch(/expired/i)
  })
})

describe("computeAppStatus — Ready for Mainnet review window", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Tuesday 12:00 Madrid time
    vi.setSystemTime(new Date("2026-05-12T10:00:00Z"))
  })
  afterEach(() => vi.useRealTimers())

  it("is 'watching' early in the window", () => {
    const s = computeAppStatus({
      current_stage: "ready_for_mainnet",
      stage_entered_at: isoOf(2026, 5, 12, 9), // 1h ago
      created_at: isoOf(2026, 5, 1),
      pm: PM,
    })
    expect(s.severity).toBe("watching")
    expect(s.timer?.kind).toBe("review")
    expect(s.timer?.budget).toBe(48)
  })

  it("is 'blocked' once the 48 business hours have passed", () => {
    // Started 5 calendar days earlier — well over 48 weekday hours
    const s = computeAppStatus({
      current_stage: "ready_for_mainnet",
      stage_entered_at: isoOf(2026, 5, 5, 9),
      created_at: isoOf(2026, 5, 1),
      pm: PM,
    })
    expect(s.severity).toBe("blocked")
    expect(s.reason).toMatch(/expired/i)
  })
})

describe("computeAppStatus — terminal stages", () => {
  it("active is idle with no timer", () => {
    const s = computeAppStatus({
      current_stage: "active",
      stage_entered_at: isoOf(2026, 1, 1),
      created_at: isoOf(2026, 1, 1),
      pm: PM,
    })
    expect(s.severity).toBe("idle")
    expect(s.timer).toBeNull()
  })

  it("killed is idle with no timer", () => {
    const s = computeAppStatus({
      current_stage: "killed",
      stage_entered_at: isoOf(2026, 1, 1),
      created_at: isoOf(2026, 1, 1),
      pm: PM,
    })
    expect(s.severity).toBe("idle")
    expect(s.timer).toBeNull()
  })

  it("launched is watching with no timer", () => {
    const s = computeAppStatus({
      current_stage: "launched",
      stage_entered_at: isoOf(2026, 1, 1),
      created_at: isoOf(2026, 1, 1),
      pm: PM,
    })
    expect(s.severity).toBe("watching")
    expect(s.timer).toBeNull()
  })
})
