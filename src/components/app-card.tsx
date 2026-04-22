import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { App, Profile } from "@/lib/db-types"
import type { AppStatus } from "@/lib/pipeline"
import { SeverityDot } from "./severity-dot"
import { cn } from "@/lib/utils"

export type AppCardData = Pick<
  App,
  "id" | "name" | "value_hypothesis" | "current_stage" | "live_url"
> & {
  pm: Pick<Profile, "full_name" | "email"> | null
}

/**
 * Tight card used inside the kanban columns. Density over polish — the goal
 * is scanning 30 apps at once and spotting blockers instantly.
 */
export function AppCard({
  app,
  status,
}: {
  app: AppCardData
  status: AppStatus
}) {
  const pmName = app.pm?.full_name ?? app.pm?.email ?? "—"
  const severityTextClass =
    status.severity === "blocked"
      ? "text-[color:var(--color-danger)]"
      : status.severity === "warning"
        ? "text-[color:var(--color-warning)]"
        : status.severity === "watching"
          ? "text-[color:var(--color-info)]"
          : "text-[color:var(--color-fg-subtle)]"

  return (
    <Link
      href={`/apps/${app.id}`}
      className={cn(
        "group block border bg-[color:var(--color-bg-elevated)] p-3 transition hover:border-[color:var(--color-accent)]",
        status.severity === "blocked"
          ? "border-[color:var(--color-danger)]/40"
          : "border-[color:var(--color-border)]"
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SeverityDot severity={status.severity} />
          <h3 className="truncate font-serif text-base leading-tight text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)]">
            {app.name}
          </h3>
        </div>
        {app.live_url && (
          <ExternalLink
            className="mt-0.5 size-3 shrink-0 text-[color:var(--color-fg-subtle)] transition group-hover:text-[color:var(--color-accent)]"
            aria-label="Live link available"
          />
        )}
      </header>

      <p className="mt-1 line-clamp-2 text-xs leading-snug text-[color:var(--color-fg-muted)]">
        {app.value_hypothesis}
      </p>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em]">
        <dt className="text-[color:var(--color-fg-subtle)]">Owner</dt>
        <dd className="truncate text-[color:var(--color-fg-muted)] normal-case tracking-normal">
          {pmName}
        </dd>

        <dt className="text-[color:var(--color-fg-subtle)]">Status</dt>
        <dd className={cn("truncate normal-case tracking-normal", severityTextClass)}>
          {status.reason}
        </dd>

        {status.blockers.length > 0 && (
          <>
            <dt className="text-[color:var(--color-fg-subtle)]">Blocked by</dt>
            <dd className="truncate text-[color:var(--color-fg)] normal-case tracking-normal">
              {status.blockers.join(", ")}
            </dd>
          </>
        )}
      </dl>
    </Link>
  )
}
