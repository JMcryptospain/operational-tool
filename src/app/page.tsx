import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowUpRight, Code2 } from "lucide-react"

import { CreateAppDialog } from "@/components/create-app-dialog"
import { StageBadge } from "@/components/stage-badge"
import { TopNav } from "@/components/top-nav"
import type { App, AppStage, Profile } from "@/lib/db-types"
import { STAGE_LABELS, daysInStage, mvpTimerLevel } from "@/lib/stages"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type AppListItem = Pick<
  App,
  | "id"
  | "name"
  | "value_hypothesis"
  | "current_stage"
  | "stage_entered_at"
  | "repo_url"
  | "live_url"
  | "pm_id"
  | "created_at"
> & { pm: Pick<Profile, "full_name" | "email"> | null }

/**
 * Stages shown on the pipeline overview. Terminal stages (active/maintain/
 * killed) are grouped under "Shipped" to keep the in-flight pipeline visible.
 */
const PIPELINE_STAGES: AppStage[] = [
  "mvp",
  "ready_for_mainnet",
  "monetization_setup",
  "launched",
  "review",
]
const SHIPPED_STAGES: AppStage[] = ["active", "maintain_only", "killed"]

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
        "id, name, value_hypothesis, current_stage, stage_entered_at, repo_url, live_url, pm_id, created_at, pm:profiles!apps_pm_id_fkey(full_name, email)"
      )
      .order("stage_entered_at", { ascending: false })
      .returns<AppListItem[]>(),
  ])

  const appList = apps ?? []
  const byStage = groupByStage(appList)
  const total = appList.length
  const inPipeline = PIPELINE_STAGES.reduce(
    (n, s) => n + (byStage.get(s)?.length ?? 0),
    0
  )
  const shipped = SHIPPED_STAGES.reduce(
    (n, s) => n + (byStage.get(s)?.length ?? 0),
    0
  )

  return (
    <div className="min-h-screen">
      <TopNav profile={profile ?? null} fallbackEmail={user.email ?? ""} />

      <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        {/* Masthead — editorial header */}
        <section className="animate-fade-in mb-12 grid gap-10 border-b border-[color:var(--color-border)] pb-12 lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div className="space-y-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-subtle)]">
              Pipeline · Week {isoWeek()} · {new Date().getFullYear()}
            </div>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-[color:var(--color-fg)] sm:text-6xl">
              What we&apos;re{" "}
              <span className="italic text-[color:var(--color-accent)]">
                shipping.
              </span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[color:var(--color-fg-muted)]">
              Every Taiko app moves through the same gates. Submit an MVP,
              earn approvals, set monetization, launch, and measure. No app
              gets a free pass.
            </p>
          </div>

          <div className="flex flex-col items-start gap-6 lg:items-end">
            <CreateAppDialog />
            <StatGrid total={total} inPipeline={inPipeline} shipped={shipped} />
          </div>
        </section>

        {/* Sections by stage */}
        <div className="space-y-16">
          {appList.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {PIPELINE_STAGES.map((stage) => {
                const bucket = byStage.get(stage)
                if (!bucket || bucket.length === 0) return null
                return (
                  <StageSection key={stage} stage={stage} apps={bucket} />
                )
              })}

              {shipped > 0 && (
                <section className="space-y-6">
                  <StageSectionHeader
                    eyebrow="Terminal"
                    title="Shipped & archived"
                    count={shipped}
                  />
                  <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                    {SHIPPED_STAGES.flatMap((s) => byStage.get(s) ?? []).map(
                      (app) => (
                        <AppRow key={app.id} app={app} />
                      )
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

/* ------------------------------- components ------------------------------- */

function StatGrid({
  total,
  inPipeline,
  shipped,
}: {
  total: number
  inPipeline: number
  shipped: number
}) {
  const stats = [
    { label: "Total", value: total },
    { label: "In Pipeline", value: inPipeline },
    { label: "Shipped", value: shipped },
  ]
  return (
    <div className="flex divide-x divide-[color:var(--color-border)] border border-[color:var(--color-border)]">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex min-w-[6.5rem] flex-col items-start gap-1 px-4 py-3"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
            {s.label}
          </span>
          <span className="font-serif text-2xl tabular-nums text-[color:var(--color-fg)]">
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function StageSectionHeader({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string
  title: string
  count: number
}) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-[color:var(--color-border)] pb-3">
      <div className="space-y-1.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-subtle)]">
          {eyebrow}
        </div>
        <h2 className="font-serif text-3xl text-[color:var(--color-fg)]">
          {title}
        </h2>
      </div>
      <div className="font-mono text-xs tabular-nums text-[color:var(--color-fg-muted)]">
        {String(count).padStart(2, "0")} {count === 1 ? "app" : "apps"}
      </div>
    </div>
  )
}

function StageSection({
  stage,
  apps,
}: {
  stage: AppStage
  apps: AppListItem[]
}) {
  return (
    <section className="space-y-5">
      <StageSectionHeader
        eyebrow={stageEyebrow(stage)}
        title={STAGE_LABELS[stage]}
        count={apps.length}
      />
      <div className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
        {apps.map((app) => (
          <AppRow key={app.id} app={app} />
        ))}
      </div>
    </section>
  )
}

function AppRow({ app }: { app: AppListItem }) {
  const days = daysInStage(app.stage_entered_at)
  const isMvp = app.current_stage === "mvp"
  const mvpLevel = isMvp ? mvpTimerLevel(days) : "ok"

  return (
    <Link
      href={`/apps/${app.id}`}
      className="group grid grid-cols-12 gap-4 px-1 py-5 transition hover:bg-[color:var(--color-bg-elevated)]"
    >
      {/* col 1-6 · name + hypothesis */}
      <div className="col-span-12 min-w-0 space-y-1.5 md:col-span-6">
        <div className="flex items-baseline gap-3">
          <h3 className="font-serif text-xl text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)]">
            {app.name}
          </h3>
          <ArrowUpRight className="size-4 shrink-0 translate-x-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="line-clamp-2 text-sm text-[color:var(--color-fg-muted)]">
          {app.value_hypothesis}
        </p>
      </div>

      {/* col 7-9 · PM */}
      <div className="col-span-6 flex flex-col justify-center gap-0.5 md:col-span-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          Owner
        </span>
        <span className="text-sm text-[color:var(--color-fg-muted)]">
          {app.pm?.full_name ?? app.pm?.email ?? "—"}
        </span>
      </div>

      {/* col 10-11 · stage + timer */}
      <div className="col-span-4 flex flex-col justify-center gap-1 md:col-span-2">
        <StageBadge stage={app.current_stage} />
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.18em]",
            mvpLevel === "danger" &&
              "text-[color:var(--color-danger)]",
            mvpLevel === "warning" &&
              "text-[color:var(--color-warning)]",
            mvpLevel === "ok" &&
              "text-[color:var(--color-fg-subtle)]"
          )}
        >
          {days}d in stage
        </span>
      </div>

      {/* col 12 · links */}
      <div className="col-span-2 flex items-center justify-end gap-3 text-[color:var(--color-fg-subtle)] md:col-span-1">
        <Code2 className="size-3.5" aria-label="repo" />
        {app.live_url && (
          <ArrowUpRight className="size-3.5" aria-label="live" />
        )}
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <section className="border border-dashed border-[color:var(--color-border-strong)] py-20 text-center">
      <div className="mx-auto max-w-md space-y-4 px-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-subtle)]">
          00 · Start here
        </div>
        <h2 className="font-serif text-3xl text-[color:var(--color-fg)]">
          Nothing in the pipeline.
        </h2>
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Submit the first MVP to begin tracking it through the launch
          pipeline.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------- helpers ------------------------------- */

function groupByStage(apps: AppListItem[]): Map<AppStage, AppListItem[]> {
  const m = new Map<AppStage, AppListItem[]>()
  for (const app of apps) {
    const list = m.get(app.current_stage) ?? []
    list.push(app)
    m.set(app.current_stage, list)
  }
  return m
}

function stageEyebrow(stage: AppStage): string {
  switch (stage) {
    case "mvp":
      return "01 · Building"
    case "ready_for_mainnet":
      return "02 · Awaiting approvals"
    case "monetization_setup":
      return "03 · Payments"
    case "launched":
      return "04 · Out there"
    case "review":
      return "05 · Under review"
    default:
      return "Archived"
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
