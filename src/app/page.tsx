import { redirect } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import { AppCard, type AppCardData } from "@/components/app-card"
import { CreateAppDialog } from "@/components/create-app-dialog"
import { SeverityDot } from "@/components/severity-dot"
import { TopNav } from "@/components/top-nav"
import type { AppStage, Profile } from "@/lib/db-types"
import {
  PIPELINE_STAGES,
  TERMINAL_STAGES,
  compareSeverity,
  computeAppStatus,
  type AppStatus,
} from "@/lib/pipeline"
import { STAGE_LABELS } from "@/lib/stages"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

/**
 * Command-center dashboard. Optimized for a single-glance view of the whole
 * portfolio — every app visible, blockers called out, owners named. Pretty
 * comes second to scannability.
 */

type DashboardApp = AppCardData & { stage_entered_at: string }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: apps }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "full_name" | "email" | "role">>(),
    supabase
      .from("apps")
      .select(
        "id, name, value_hypothesis, current_stage, stage_entered_at, live_url, pm:profiles!apps_pm_id_fkey(full_name, email)"
      )
      .order("stage_entered_at", { ascending: false })
      .returns<DashboardApp[]>(),
  ])

  const appList = apps ?? []

  // Compute status + group by stage in a single pass.
  const enriched = appList.map((app) => ({
    app,
    status: computeAppStatus({
      current_stage: app.current_stage,
      stage_entered_at: app.stage_entered_at,
      pm: app.pm,
    }),
  }))

  const byStage = new Map<AppStage, typeof enriched>()
  for (const row of enriched) {
    const list = byStage.get(row.app.current_stage) ?? []
    list.push(row)
    byStage.set(row.app.current_stage, list)
  }
  for (const list of byStage.values()) {
    list.sort((a, b) => compareSeverity(a.status.severity, b.status.severity))
  }

  const needsAttention = enriched.filter(
    (r) => r.status.severity === "blocked" || r.status.severity === "warning"
  )
  needsAttention.sort((a, b) =>
    compareSeverity(a.status.severity, b.status.severity)
  )

  const terminalApps = TERMINAL_STAGES.flatMap((s) => byStage.get(s) ?? [])

  // Bottleneck roll-up: who is currently named as a blocker, and how many
  // apps is each person holding up?
  const bottlenecks = new Map<string, number>()
  for (const r of enriched) {
    if (r.status.severity === "idle" || r.status.severity === "watching")
      continue
    for (const b of r.status.blockers) {
      bottlenecks.set(b, (bottlenecks.get(b) ?? 0) + 1)
    }
  }
  const rankedBottlenecks = [...bottlenecks.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const totals = {
    total: appList.length,
    inPipeline: PIPELINE_STAGES.reduce(
      (n, s) => n + (byStage.get(s)?.length ?? 0),
      0
    ),
    blocked: enriched.filter((r) => r.status.severity === "blocked").length,
    shipped: terminalApps.length,
  }

  return (
    <div className="min-h-screen">
      <TopNav profile={profile ?? null} fallbackEmail={user.email ?? ""} />

      <main className="mx-auto w-full max-w-[120rem] px-6 py-8 lg:px-10 lg:py-10">
        {/* Compact masthead — keeps the overview above the fold */}
        <section className="animate-fade-in mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-subtle)]">
              Pipeline Overview · Week {isoWeek()} · {new Date().getFullYear()}
            </div>
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight text-[color:var(--color-fg)] sm:text-5xl">
              The whole{" "}
              <span className="italic text-[color:var(--color-accent)]">
                pipeline.
              </span>
            </h1>
          </div>

          <div className="flex flex-col items-start gap-5 lg:items-end">
            <CreateAppDialog />
            <StatStrip {...totals} />
          </div>
        </section>

        {/* Attention required — bottlenecks + blocked/stale apps */}
        {appList.length > 0 &&
          (needsAttention.length > 0 || rankedBottlenecks.length > 0) && (
            <AttentionPanel
              needsAttention={needsAttention}
              rankedBottlenecks={rankedBottlenecks}
            />
          )}

        {/* Kanban — the whole pipeline at a glance */}
        {appList.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="mt-10">
            <SectionHeader
              eyebrow="Board"
              title="By stage"
              count={totals.inPipeline}
            />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {PIPELINE_STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  items={byStage.get(stage) ?? []}
                />
              ))}
            </div>
          </section>
        )}

        {/* Terminal apps collapsed row */}
        {terminalApps.length > 0 && (
          <section className="mt-12">
            <SectionHeader
              eyebrow="Shipped & archived"
              title="Terminal stages"
              count={terminalApps.length}
            />
            <ul className="mt-4 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
              {terminalApps.map(({ app, status }) => (
                <li key={app.id}>
                  <a
                    href={`/apps/${app.id}`}
                    className="flex items-center gap-4 py-3 transition hover:bg-[color:var(--color-bg-elevated)]"
                  >
                    <SeverityDot severity={status.severity} />
                    <span className="flex-1 truncate text-sm text-[color:var(--color-fg)]">
                      {app.name}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
                      {STAGE_LABELS[app.current_stage]}
                    </span>
                    <span className="min-w-32 truncate text-xs text-[color:var(--color-fg-muted)]">
                      {app.pm?.full_name ?? app.pm?.email ?? "—"}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}

/* ------------------------------- components ------------------------------- */

function StatStrip({
  total,
  inPipeline,
  blocked,
  shipped,
}: {
  total: number
  inPipeline: number
  blocked: number
  shipped: number
}) {
  const items = [
    { label: "Total", value: total, tone: "default" as const },
    { label: "In Pipeline", value: inPipeline, tone: "default" as const },
    { label: "Blocked", value: blocked, tone: "danger" as const },
    { label: "Shipped", value: shipped, tone: "default" as const },
  ]
  return (
    <div className="flex divide-x divide-[color:var(--color-border)] border border-[color:var(--color-border)]">
      {items.map((s) => (
        <div
          key={s.label}
          className="flex min-w-[5.5rem] flex-col items-start gap-0.5 px-3 py-2"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
            {s.label}
          </span>
          <span
            className={cn(
              "font-serif text-2xl tabular-nums",
              s.tone === "danger" && s.value > 0
                ? "text-[color:var(--color-danger)]"
                : "text-[color:var(--color-fg)]"
            )}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function AttentionPanel({
  needsAttention,
  rankedBottlenecks,
}: {
  needsAttention: Array<{ app: DashboardApp; status: AppStatus }>
  rankedBottlenecks: Array<[string, number]>
}) {
  return (
    <section className="animate-fade-in-delayed grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Left — blocked / stale list */}
      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-[color:var(--color-danger)]" />
            <h2 className="font-serif text-lg text-[color:var(--color-fg)]">
              Needs attention
            </h2>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
            {needsAttention.length} {needsAttention.length === 1 ? "app" : "apps"}
          </span>
        </header>
        {needsAttention.length === 0 ? (
          <div className="p-6 text-sm text-[color:var(--color-fg-muted)]">
            Nothing blocked or stale. Nice.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {needsAttention.slice(0, 6).map(({ app, status }) => (
              <li key={app.id}>
                <a
                  href={`/apps/${app.id}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-[color:var(--color-bg-overlay)]"
                >
                  <SeverityDot severity={status.severity} />
                  <div className="min-w-0 space-y-0.5">
                    <div className="truncate font-serif text-base text-[color:var(--color-fg)]">
                      {app.name}
                    </div>
                    <div className="truncate text-xs text-[color:var(--color-fg-muted)]">
                      <span
                        className={cn(
                          status.severity === "blocked"
                            ? "text-[color:var(--color-danger)]"
                            : "text-[color:var(--color-warning)]"
                        )}
                      >
                        {status.reason}
                      </span>
                      {status.blockers.length > 0 && (
                        <>
                          {" · waiting on "}
                          <span className="text-[color:var(--color-fg)]">
                            {status.blockers.join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
                    {STAGE_LABELS[app.current_stage]}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right — bottleneck leaderboard */}
      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
        <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
          <h2 className="font-serif text-lg text-[color:var(--color-fg)]">
            Bottlenecks
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
            by count
          </span>
        </header>
        {rankedBottlenecks.length === 0 ? (
          <div className="p-6 text-sm text-[color:var(--color-fg-muted)]">
            Nobody is holding anything up.
          </div>
        ) : (
          <ol className="divide-y divide-[color:var(--color-border)]">
            {rankedBottlenecks.map(([name, count], i) => (
              <li
                key={name}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-5 font-mono text-[11px] tabular-nums text-[color:var(--color-fg-subtle)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate text-sm text-[color:var(--color-fg)]">
                  {name}
                </span>
                <span className="font-mono text-sm tabular-nums text-[color:var(--color-accent)]">
                  {count}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

function KanbanColumn({
  stage,
  items,
}: {
  stage: AppStage
  items: Array<{ app: DashboardApp; status: AppStatus }>
}) {
  const blocked = items.filter((i) => i.status.severity === "blocked").length
  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] pb-2">
        <div className="space-y-0.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
            {stageEyebrow(stage)}
          </div>
          <h3 className="font-serif text-lg leading-tight text-[color:var(--color-fg)]">
            {STAGE_LABELS[stage]}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {blocked > 0 && (
            <span
              className="font-mono text-[10px] tabular-nums text-[color:var(--color-danger)]"
              aria-label={`${blocked} blocked`}
            >
              ●{blocked}
            </span>
          )}
          <span className="font-mono text-xs tabular-nums text-[color:var(--color-fg-muted)]">
            {items.length}
          </span>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-border)] p-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          Empty
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(({ app, status }) => (
            <li key={app.id}>
              <AppCard app={app} status={status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string
  title: string
  count: number
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[color:var(--color-border)] pb-3">
      <div className="space-y-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-subtle)]">
          {eyebrow}
        </div>
        <h2 className="font-serif text-2xl text-[color:var(--color-fg)]">
          {title}
        </h2>
      </div>
      <div className="font-mono text-xs tabular-nums text-[color:var(--color-fg-muted)]">
        {String(count).padStart(2, "0")} {count === 1 ? "app" : "apps"}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <section className="mt-10 border border-dashed border-[color:var(--color-border-strong)] py-20 text-center">
      <div className="mx-auto max-w-md space-y-4 px-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-subtle)]">
          00 · Start here
        </div>
        <h2 className="font-serif text-3xl text-[color:var(--color-fg)]">
          Nothing in the pipeline.
        </h2>
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Submit the first MVP to start tracking it.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------- helpers ------------------------------- */

function stageEyebrow(stage: AppStage): string {
  switch (stage) {
    case "mvp":
      return "01 · Building"
    case "ready_for_mainnet":
      return "02 · Approvals"
    case "monetization_setup":
      return "03 · Payments"
    case "launched":
      return "04 · Live"
    case "review":
      return "05 · Review"
    default:
      return ""
  }
}

function isoWeek(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  )
}
