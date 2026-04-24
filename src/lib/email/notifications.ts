import { createClient as createAdminClient } from "@supabase/supabase-js"
import { appUrl, sendEmail, type SendResult } from "./client"
import { layout } from "./templates"
import type { AppRole } from "@/lib/db-types"

/**
 * High-level notification helpers. Each function is tolerant of missing
 * recipients — if the matching role isn't assigned yet, we skip instead of
 * throwing, so app-pipeline transitions never fail because of email.
 *
 * All of these use a server-only Supabase client with the service role key
 * so they can read profiles regardless of the caller's RLS context.
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
  ownerName?: string | null
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

/* ============================= triggers ============================= */

/** Fired right after a PM submits a new app. */
export async function notifyAppSubmitted(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await ownerEmail(ctx.appId)
  if (!to) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `${ctx.appName} is in the pipeline.`,
    heading: `${ctx.appName} is in the pipeline`,
    intro: `You submitted ${ctx.appName}. Take it through the five phases on Taiko Launchpad.`,
    meta: [
      ["App", ctx.appName],
      ["Stage", "MVP"],
      ["Next step", "Refining & Legal"],
    ],
    ctaLabel: "Open app",
    ctaHref: href,
  })
  return sendEmail({ to, subject: `${ctx.appName} is in the pipeline`, html, text })
}

/** Fired when an app enters Refining — Jonathan (legal_lead) is the actor. */
export async function notifyEnteredRefining(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await emailsForRoles(["legal_lead"])
  if (to.length === 0) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `Legal review needed for ${ctx.appName}.`,
    heading: `Legal review needed: ${ctx.appName}`,
    intro: `${ctx.appName} has entered the Refining & Legal phase. Please do a high-level legal review and confirm monetization is operationally ready.`,
    meta: [
      ["App", ctx.appName],
      ["Phase", "Refining & Legal"],
      ["Your role", "Legal Lead"],
    ],
    ctaLabel: "Review app",
    ctaHref: href,
  })
  return sendEmail({
    to,
    subject: `Legal review needed: ${ctx.appName}`,
    html,
    text,
  })
}

/** Fired when an app enters Ready for Mainnet — notifies Gustavo + Joaquín. */
export async function notifyEnteredRFM(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await emailsForRoles(["cto", "coo"])
  if (to.length === 0) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `Your approval is needed within 48h.`,
    heading: `${ctx.appName}: ready for your approval`,
    intro: `The app is ready to ship to mainnet. You have 48 business hours to approve or reject.`,
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

/** Fired when the 48h window has <12h remaining and an approver hasn't acted. */
export async function notifyRFMWarning(
  ctx: AppEmailCtx,
  missingRoles: Array<"cto" | "coo">
): Promise<SendResult | null> {
  if (missingRoles.length === 0) return null
  const to = await emailsForRoles(missingRoles as AppRole[])
  if (to.length === 0) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `Less than 12h left to approve ${ctx.appName}.`,
    heading: `Reminder: ${ctx.appName} needs your approval`,
    intro: `Less than 12 business hours remain in the 48h review window. Please approve or reject so this doesn't get stuck.`,
    meta: [
      ["App", ctx.appName],
      ["Phase", "Ready for Mainnet"],
      ["Status", "< 12h remaining"],
    ],
    ctaLabel: "Review now",
    ctaHref: href,
  })
  return sendEmail({
    to,
    subject: `Reminder: ${ctx.appName} needs your approval`,
    html,
    text,
  })
}

/** Fired when the 48h window has expired — escalate to cofounders. */
export async function notifyRFMExpired(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await emailsForRoles(["cofounder"])
  if (to.length === 0) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `48h window expired without approval.`,
    heading: `Escalation: ${ctx.appName} is stuck`,
    intro: `The 48h approval window for ${ctx.appName} has expired without a decision. You're being looped in as a cofounder so this doesn't fall through.`,
    meta: [
      ["App", ctx.appName],
      ["Phase", "Ready for Mainnet"],
      ["Status", "Window expired"],
    ],
    ctaLabel: "Investigate",
    ctaHref: href,
    footerNote:
      "Escalated to cofounders because the regular approvers did not act in time.",
  })
  return sendEmail({
    to,
    subject: `Escalation: ${ctx.appName} is stuck in Ready for Mainnet`,
    html,
    text,
  })
}

/** Fired when the app transitions into Launched — notifies Marketing Lead. */
export async function notifyLaunched(
  ctx: AppEmailCtx
): Promise<SendResult | null> {
  const to = await emailsForRoles(["marketing_lead"])
  if (to.length === 0) return null
  const href = appUrl(`/apps/${ctx.appId}`)
  const { html, text } = layout({
    preheader: `Time to fire the MKT basic package.`,
    heading: `${ctx.appName} is live — run the MKT basic package`,
    intro: `${ctx.appName} just launched on mainnet. Kick off the MKT Basic checklist: promoted tweet, Proving Ground article, and video.`,
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

/**
 * Direct self-test email. Used by an admin-only debug endpoint so we can
 * verify the Resend setup end-to-end without firing a real workflow.
 */
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
