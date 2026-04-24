import { Eye, Download, CreditCard, Users } from "lucide-react"
import { appUrl } from "@/lib/email/client"
import type { AppMetrics } from "@/lib/posthog"
import { cn } from "@/lib/utils"

/**
 * Read-only "Adoption" section rendered on the app detail page. Shows
 * the core three metrics the owner cares about plus unique users as a
 * quick-sanity check. Values are `null` when PostHog has no data yet
 * (app not wired, nobody has used it) — we render an em-dash instead
 * of zero so the owner can tell "no data" apart from "real zero".
 *
 * Note: appUrl is imported only so we keep this component a pure server
 * component (no client deps) — we don't actually render any link here.
 */
void appUrl

export function AdoptionCards({
  metrics,
  analyticsWired,
  posthogHost,
  slug,
}: {
  metrics: AppMetrics | null
  analyticsWired: boolean
  posthogHost: string
  slug: string
}) {
  const disabled = !analyticsWired

  return (
    <section className="rounded-lg border border-[color:var(--color-border)] bg-white p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--color-fg)]">
            Adoption
          </h2>
          <p className="mt-0.5 text-xs text-[color:var(--color-fg-muted)]">
            {disabled
              ? "Analytics aren't wired yet — metrics will appear once events start landing in PostHog."
              : "Last 7 and 30 days from the shared Taiko PostHog project."}
          </p>
        </div>
        <a
          href={`${posthogHost}/events?properties=${encodeURIComponent(
            JSON.stringify([
              { key: "app", value: slug, operator: "exact", type: "event" },
            ])
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1 text-xs text-[color:var(--color-fg-muted)] underline underline-offset-2 hover:text-[color:var(--color-accent)]"
        >
          Open in PostHog →
        </a>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={<Eye className="size-3.5" />}
          label="Pageviews (7d)"
          value={metrics?.pageviews7d}
          secondary={fmt30d("pageviews", metrics?.pageviews30d)}
          disabled={disabled}
        />
        <Card
          icon={<Users className="size-3.5" />}
          label="Unique users (30d)"
          value={metrics?.uniqueUsers30d}
          disabled={disabled}
        />
        <Card
          icon={<Download className="size-3.5" />}
          label="Download clicks (30d)"
          value={metrics?.downloadClicks30d}
          disabled={disabled}
        />
        <Card
          icon={<CreditCard className="size-3.5" />}
          label="Paid events (30d)"
          value={metrics?.paymentsCompleted30d}
          secondary={
            metrics?.revenueTotal30d != null
              ? `$${Math.round(metrics.revenueTotal30d).toLocaleString()} revenue`
              : undefined
          }
          disabled={disabled}
        />
      </div>
    </section>
  )
}

function Card({
  icon,
  label,
  value,
  secondary,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  value: number | null | undefined
  secondary?: string
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] p-3",
        disabled && "opacity-60"
      )}
    >
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-[color:var(--color-fg)]">
          {value == null ? "—" : value.toLocaleString()}
        </span>
        {secondary && (
          <span className="truncate text-xs text-[color:var(--color-fg-muted)]">
            {secondary}
          </span>
        )}
      </div>
    </div>
  )
}

function fmt30d(label: string, value: number | null | undefined): string {
  if (value == null) return ""
  return `${value.toLocaleString()} ${label} in 30d`
}
