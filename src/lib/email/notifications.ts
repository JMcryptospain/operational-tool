import { createClient as createAdminClient } from "@supabase/supabase-js"
import { appUrl, sendEmail, type SendResult } from "./client"
import { layout } from "./templates"
import type { AppRole } from "@/lib/db-types"

/**
 * Email notification helpers.
 *
 * Final list of triggers (per product decision):
 *  - notifyEnteredRFM        -> CTO + COO  (approve call-to-action)
 *  - notifyEnteredRFMOwner   -> Owner      (heads-up that escalation happened)
 *  - notifyApprovedToLaunch  -> Owner      (both approvers signed off)
 *  - notifyLaunched          -> MKT Lead   (time to run the MKT package)
 *
 * Everything else (owner tested, legal approved, monet marked,
 * individual approve/reject, MKT completed, submit) is intentionally
 * silent — the UI shows the state, no inbox noise.
 *
 * Also exposed: sendTestEmail and notifyAppSubmitted as dormant helpers.
 */

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase admin env vars missing")
  }
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type AppEmailCtx = {
  appId: string
  appName: string
}

async function emailsForRoles(roles: AppRole[]): Promise<string[]> {
  const sb = adminClient()
  const { data } = await sb
    .from("profiles")
    .select("email")
    .in("role", roles)
  return (data ?? []).map((r) => r.email).filter(Boolean)
}

async function ownerEmail(appId: string): Promise<string | null> {
  const sb = adminClient()
  const { data } = await sb
    .from("apps")
    .select("pm:profiles!apps_pm_id_fkey(email)")
    .eq("id", appId)
    .maybeSingle<{ pm: { email: string } | null }>()
  return data?.pm?.email ?? null
}

/* ================== Trigger 1 · App enters RFM — approvers ================== */

export async function notifyEnteredRFM(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await emailsForRoles(["cto", "coo"])
  if (to.length === 0) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `Your approval is needed within 48h.`,
    heading: `${ctx.appName}: Ready for Mainnet`,
    intro: `The app has cleared Refining & Legal. Please review and approve or reject within 48 business hours so it can ship to mainnet.`,
    meta: [
      ["App", ctx.appName],
      ["Phase", "Ready for Mainnet"],
      ["Window", "48 business hours (Europe/Madrid, Mon–Fri)"],
    ],
    ctaLabel: "Approve or reject",
    ctaHref: href,
  })
  return sendEmail({
    to,
    subject: `Approval needed: ${ctx.appName}`,
    html,
    text,
  })
}

/* ================== Trigger 2 · App enters RFM — owner heads-up ================== */

export async function notifyEnteredRFMOwner(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await ownerEmail(ctx.appId)
  if (!to) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `Gustavo and Joaquín have been notified.`,
    heading: `${ctx.appName} is now in Ready for Mainnet`,
    intro: `Refining & Legal is complete. Gustavo (CTO) and Joaquín (COO) have been notified and will review within 48 business hours. You'll get another email when they've made a decision.`,
    meta: [
      ["App", ctx.appName],
      ["Phase", "Ready for Mainnet"],
      ["Next", "Awaiting Gustavo + Joaquín"],
    ],
    ctaLabel: "Open app",
    ctaHref: href,
  })
  return sendEmail({
    to,
    subject: `${ctx.appName} is in Ready for Mainnet`,
    html,
    text,
  })
}

/* ================== Trigger 3 · Approved to launch — owner ================== */

export async function notifyApprovedToLaunch(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await ownerEmail(ctx.appId)
  if (!to) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `You can now ship ${ctx.appName} to mainnet.`,
    heading: `${ctx.appName} is approved to launch on mainnet`,
    intro: `Both Gustavo (CTO) and Joaqu\u00edn (COO) have approved. ${ctx.appName} is cleared to ship.`,
    meta: [
      ["App", ctx.appName],
      ["Phase", "Launched (awaiting deployment)"],
      ["Next step", "Deploy, then mark the app live on mainnet"],
    ],
    body: `<p style="margin:0;">
      <strong>Important:</strong> once the app is actually deployed and live
      on mainnet, remember to open its page on Launchpad and click
      <em>Mark live on mainnet</em>. That's what triggers the marketing
      handoff \u2014 without it, Tiffany doesn't know to start the MKT push.
    </p>`,
    ctaLabel: "Open app",
    ctaHref: href,
  })
  return sendEmail({
    to,
    subject: `${ctx.appName} is approved to launch on mainnet`,
    html,
    text,
  })
}

/* ================== Trigger 5 · RFM 48h expired — nudge the approver ================== */

/**
 * The 48h review window passed without both approvers acting. We send an
 * extra nudge to whichever approver still hasn't decided. No escalation,
 * no cc to anyone else — just another reminder to the same person.
 */
export async function notifyRFMExpired(input: {
  appId: string
  appName: string
  missingRoles: Array<"cto" | "coo">
}): Promise<SendResult | null> {
  if (input.missingRoles.length === 0) return null
  const to = await emailsForRoles(input.missingRoles as AppRole[])
  if (to.length === 0) return null
  const href = appUrl(`/apps/${input.appId}`)
  const { html, text } = layout({
    preheader: `${input.appName} is past its 48h approval window.`,
    heading: `${input.appName} is past its 48h approval window`,
    intro: `The standard review window has closed. Please approve or reject so the owner can move forward.`,
    meta: [
      ["App", input.appName],
      ["Phase", "Ready for Mainnet"],
      ["Status", "Window expired"],
    ],
    ctaLabel: "Review now",
    ctaHref: href,
  })
  return sendEmail({
    to,
    subject: `Past deadline: ${input.appName} still needs your approval`,
    html,
    text,
  })
}

/* ================== Trigger 4 · Launched — Marketing Lead ================== */

export async function notifyLaunched(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await emailsForRoles(["marketing_lead"])
  if (to.length === 0) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `Time to fire the MKT basic package.`,
    heading: `${ctx.appName} is live — run the MKT basic package`,
    intro: `${ctx.appName} just launched on mainnet. Kick off the MKT Basic checklist: promoted tweet, Proving Ground article, video, AI product listings, and media pitch.`,
    meta: [
      ["App", ctx.appName],
      ["Phase", "Launched"],
      ["Your role", "Marketing Lead"],
    ],
    ctaLabel: "Open MKT checklist",
    ctaHref: href,
  })
  return sendEmail({
    to,
    subject: `${ctx.appName} launched — run MKT package`,
    html,
    text,
  })
}

/* ================== Admin test email ================== */

export async function sendTestEmail(to: string): Promise<SendResult> {
  const href = appUrl("/")
  const { html, text } = layout({
    preheader: `Hello from Taiko Launchpad.`,
    heading: `Hello from Taiko Launchpad`,
    intro: `If you're reading this, email delivery is working end-to-end.`,
    meta: [
      ["Sent to", to],
      ["Env", process.env.NODE_ENV ?? "unknown"],
    ],
    ctaLabel: "Open Launchpad",
    ctaHref: href,
    footerNote: "This was a manual test fired from the admin panel.",
  })
  return sendEmail({
    to,
    subject: "Test from Taiko Launchpad",
    html,
    text,
  })
}

/* ================== Dormant — kept for future wiring ================== */

/** Silent in production today. Kept available in case we re-enable welcome. */
export async function notifyAppSubmitted(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await ownerEmail(ctx.appId)
  if (!to) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `${ctx.appName} is in the pipeline.`,
    heading: `${ctx.appName} is in the pipeline`,
    intro: `You submitted ${ctx.appName}. It's now in Refining & Legal.`,
    meta: [
      ["App", ctx.appName],
      ["Phase", "Refining & Legal"],
    ],
    ctaLabel: "Open app",
    ctaHref: href,
  })
  return sendEmail({
    to,
    subject: `${ctx.appName} is in the pipeline`,
    html,
    text,
  })
}
