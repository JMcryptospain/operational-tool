/**
 * Thin client for PostHog's HogQL query endpoint. Used server-side only
 * (reads POSTHOG_PERSONAL_API_KEY). Each helper returns numbers or null
 * on failure so the UI can gracefully degrade to "—".
 *
 * We filter by the `app` event property (set in the shared snippet as a
 * register + group call), which is how we tell Taiko apps apart in the
 * single shared project.
 */

const DEFAULT_HOST = "https://eu.posthog.com"

type HogQLResponse = {
  results?: Array<Array<unknown>>
  error?: string
}

async function runHogQL(query: string): Promise<HogQLResponse | null> {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? DEFAULT_HOST
  const projectId = process.env.POSTHOG_PROJECT_ID
  const key = process.env.POSTHOG_PERSONAL_API_KEY
  if (!projectId || !key) {
    console.warn("[posthog] missing env vars; skipping query")
    return null
  }

  try {
    const res = await fetch(
      `${host}/api/projects/${projectId}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          query: { kind: "HogQLQuery", query },
        }),
        // PostHog queries are usually <1s but set a cap so we never block
        // the page render indefinitely.
        signal: AbortSignal.timeout(8_000),
        // Cache each query for 5 minutes to avoid hammering the API when
        // multiple users hit the detail page.
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) {
      const body = await res.text()
      console.error("[posthog] HTTP", res.status, body.slice(0, 300))
      return null
    }
    return (await res.json()) as HogQLResponse
  } catch (e) {
    console.error("[posthog] query failed", e)
    return null
  }
}

function firstNumber(r: HogQLResponse | null): number | null {
  if (!r?.results || r.results.length === 0) return null
  const cell = r.results[0]?.[0]
  if (typeof cell === "number") return cell
  if (typeof cell === "string" && !Number.isNaN(Number(cell))) return Number(cell)
  return null
}

/**
 * PostHog stores event properties on JSON columns. We filter by both
 * posthog.group('app', slug) *and* posthog.register({app: slug}) so we
 * catch events from either pattern.
 */
function appFilter(slug: string): string {
  const safe = slug.replace(/'/g, "''")
  return `(properties.app = '${safe}' OR "$group_0" = '${safe}')`
}

/* ============================= per-app metrics ============================= */

export type AppMetrics = {
  pageviews7d: number | null
  pageviews30d: number | null
  uniqueUsers30d: number | null
  downloadClicks30d: number | null
  paymentsCompleted30d: number | null
  revenueTotal30d: number | null
}

export async function fetchAppMetrics(slug: string): Promise<AppMetrics> {
  const filter = appFilter(slug)

  const [
    pv7,
    pv30,
    users30,
    dl30,
    pay30,
    revenue30,
  ] = await Promise.all([
    runHogQL(
      `SELECT count() FROM events WHERE event = '$pageview' AND ${filter} AND timestamp >= now() - interval 7 day`
    ),
    runHogQL(
      `SELECT count() FROM events WHERE event = '$pageview' AND ${filter} AND timestamp >= now() - interval 30 day`
    ),
    runHogQL(
      `SELECT count(DISTINCT distinct_id) FROM events WHERE ${filter} AND timestamp >= now() - interval 30 day`
    ),
    runHogQL(
      `SELECT count() FROM events WHERE event = 'download_clicked' AND ${filter} AND timestamp >= now() - interval 30 day`
    ),
    runHogQL(
      `SELECT count() FROM events WHERE event = 'payment_completed' AND ${filter} AND timestamp >= now() - interval 30 day`
    ),
    runHogQL(
      `SELECT sum(toFloat(properties.amount)) FROM events WHERE event = 'payment_completed' AND ${filter} AND timestamp >= now() - interval 30 day`
    ),
  ])

  return {
    pageviews7d: firstNumber(pv7),
    pageviews30d: firstNumber(pv30),
    uniqueUsers30d: firstNumber(users30),
    downloadClicks30d: firstNumber(dl30),
    paymentsCompleted30d: firstNumber(pay30),
    revenueTotal30d: firstNumber(revenue30),
  }
}

export function isPosthogConfigured(): boolean {
  return Boolean(
    process.env.POSTHOG_PROJECT_ID && process.env.POSTHOG_PERSONAL_API_KEY
  )
}
