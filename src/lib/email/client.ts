import { Resend } from "resend"

/**
 * Lazily instantiated Resend client. Read the API key at call time so a
 * misconfigured env doesn't crash the module import.
 */
let client: Resend | null = null

function getClient(): Resend | null {
  if (client) return client
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  client = new Resend(key)
  return client
}

export type SendArgs = {
  to: string | string[]
  subject: string
  html: string
  /** Plain-text fallback for clients that hide HTML. */
  text: string
  /** Optional reply-to override. */
  replyTo?: string
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/**
 * Wrapper around Resend's send that:
 *  - Pulls From + API key from env
 *  - Dedupes recipients
 *  - Logs failures to the server console so Vercel surfaces them
 *  - Never throws — returns a tagged result so callers can decide what to do
 */
export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const from =
    process.env.EMAIL_FROM ??
    "Taiko Launchpad <noreply@launchpad.taiko.xyz>"

  const resend = getClient()
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping send.")
    return { ok: false, error: "Email provider not configured" }
  }

  const recipients = Array.isArray(args.to)
    ? Array.from(new Set(args.to.filter(Boolean)))
    : [args.to].filter(Boolean)
  if (recipients.length === 0) {
    return { ok: false, error: "No recipients" }
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    })
    if (error) {
      console.error("[email] Resend error:", error)
      return { ok: false, error: error.message ?? "send failed" }
    }
    return { ok: true, id: data?.id ?? "" }
  } catch (e) {
    console.error("[email] unexpected error:", e)
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Absolute URL for a given path in the deployed app, used by email links.
 * Prefers APP_URL (explicit); falls back to VERCEL_URL injected at build time;
 * finally localhost for dev.
 */
export function appUrl(path: string = "/"): string {
  const explicit = process.env.APP_URL
  if (explicit) return new URL(path, explicit).toString()
  const vercel = process.env.VERCEL_URL
  if (vercel) return new URL(path, `https://${vercel}`).toString()
  return new URL(path, "http://localhost:3000").toString()
}
