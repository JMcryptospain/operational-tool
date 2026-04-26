import { createClient } from "@supabase/supabase-js"
import { notifyRFMExpired } from "@/lib/email/notifications"
import { businessHoursBetween } from "@/lib/pipeline"

/**
 * Cron handler invoked daily by Vercel Cron at 09:00 Madrid time.
 *
 * Hobby plan only allows one cron run per day, so this runs once a day
 * and:
 *   - For every app in Ready for Mainnet whose 48-business-hour window
 *     has elapsed without both approvers signing off, sends an extra
 *     nudge email to whichever approver still hasn't decided.
 *   - Idempotent within a single window: rfm_reminders_sent prevents
 *     re-sending the same reminder. We do NOT send pre-deadline warnings
 *     (the dashboard already flags the row visually).
 *
 * Auth: requires Bearer CRON_SECRET. Vercel Cron sends that header
 * automatically when the env var is set.
 */

// Edge runtime would be cheaper but the Supabase client prefers Node.
export const runtime = "nodejs"
// Never cache — always hit live DB.
export const dynamic = "force-dynamic"

const REVIEW_BUDGET_HOURS = 48

type ApprovalRow = {
  approver_role: "cto" | "coo"
  status: "pending" | "approved" | "rejected"
}

type AppRow = {
  id: string
  name: string
  stage_entered_at: string
  ready_for_mainnet_window_start: string | null
  approvals: ApprovalRow[]
  reminders: Array<{ kind: "warning" | "expired" }>
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase admin env vars missing")
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // In dev (no secret set) allow so we can invoke it manually.
    return process.env.NODE_ENV !== "production"
  }
  const header = req.headers.get("authorization") ?? ""
  return header === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 })
  }

  const sb = adminClient()
  const now = new Date()

  const { data: apps, error } = await sb
    .from("apps")
    .select(
      `id, name, stage_entered_at, ready_for_mainnet_window_start,
       approvals(approver_role, status),
       reminders:rfm_reminders_sent(kind)`
    )
    .eq("current_stage", "ready_for_mainnet")
    .returns<AppRow[]>()

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  const summary: Array<Record<string, unknown>> = []

  for (const app of apps ?? []) {
    const windowStart = new Date(
      app.ready_for_mainnet_window_start ?? app.stage_entered_at
    )
    const elapsedHours = businessHoursBetween(windowStart, now)

    const missing: Array<"cto" | "coo"> = (["cto", "coo"] as const).filter(
      (role) => {
        const row = app.approvals.find((a) => a.approver_role === role)
        return !row || row.status !== "approved"
      }
    )

    const alreadySent = app.reminders.some((r) => r.kind === "expired")

    if (
      elapsedHours >= REVIEW_BUDGET_HOURS &&
      !alreadySent &&
      missing.length > 0
    ) {
      const r = await notifyRFMExpired({
        appId: app.id,
        appName: app.name,
        missingRoles: missing,
      })
      if (r?.ok) {
        await sb.from("rfm_reminders_sent").insert({
          app_id: app.id,
          kind: "expired",
        })
      }
      summary.push({
        app: app.name,
        action: "expired",
        sent: r?.ok ?? false,
        error: r && !r.ok ? r.error : undefined,
      })
      continue
    }

    summary.push({ app: app.name, action: "skip", elapsedHours })
  }

  return Response.json({ ok: true, processed: summary.length, summary })
}
