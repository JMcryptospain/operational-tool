import { redirect } from "next/navigation"

import { CreateAppDialog } from "@/components/create-app-dialog"
import {
  PipelineTable,
  type PipelineRow,
} from "@/components/pipeline-table"
import { TopNav } from "@/components/top-nav"
import type { App, AppStage, Profile } from "@/lib/db-types"
import {
  PIPELINE_STAGES,
  computeAppStatus,
} from "@/lib/pipeline"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type DashboardApp = Pick<
  App,
  | "id"
  | "name"
  | "current_stage"
  | "stage_entered_at"
  | "live_url"
  | "repo_url"
  | "monetization_model"
> & { pm: Pick<Profile, "full_name" | "email"> | null }

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
        "id, name, current_stage, stage_entered_at, live_url, repo_url, monetization_model, pm:profiles!apps_pm_id_fkey(full_name, email)"
      )
      .order("stage_entered_at", { ascending: false })
      .returns<DashboardApp[]>(),
  ])

  const appList = apps ?? []

  // Pre-compute status on the server and ship a flat row to the client.
  const rows: PipelineRow[] = appList.map((app) => {
    const status = computeAppStatus({
      current_stage: app.current_stage,
      stage_entered_at: app.stage_entered_at,
      pm: app.pm,
    })
    return {
      id: app.id,
      name: app.name,
      current_stage: app.current_stage,
      stage_entered_at: app.stage_entered_at,
      live_url: app.live_url,
      repo_url: app.repo_url,
      monetization_model: app.monetization_model,
      pm_name: app.pm?.full_name ?? "",
      pm_email: app.pm?.email ?? "",
      status,
    }
  })

  // Totals
  const byStage = new Map<AppStage, number>()
  for (const r of rows)
    byStage.set(r.current_stage, (byStage.get(r.current_stage) ?? 0) + 1)
  const inPipeline = PIPELINE_STAGES.reduce(
    (n, s) => n + (byStage.get(s) ?? 0),
    0
  )
  const blocked = rows.filter((r) => r.status.severity === "blocked").length
  const warning = rows.filter((r) => r.status.severity === "warning").length

  // Bottleneck ranking across non-idle apps
  const bottlenecks = new Map<string, number>()
  for (const r of rows) {
    if (r.status.severity === "idle" || r.status.severity === "watching")
      continue
    for (const b of r.status.blockers) {
      bottlenecks.set(b, (bottlenecks.get(b) ?? 0) + 1)
    }
  }
  const rankedBottlenecks = [...bottlenecks.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  return (
    <div className="min-h-screen">
      <TopNav profile={profile ?? null} fallbackEmail={user.email ?? ""} />

      <main className="mx-auto w-full max-w-[108rem] px-6 py-6 lg:px-10">
        {/* Thin top strip — totals on the left, CTA on the right */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[color:var(--color-border)] pb-4">
          <StatsInline
            total={rows.length}
            inPipeline={inPipeline}
            warning={warning}
            blocked={blocked}
          />
          <CreateAppDialog />
        </div>

        {/* Bottleneck strip — horizontal, one line */}
        {rankedBottlenecks.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[color:var(--color-border)] pb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
              Bottlenecks
            </span>
            {rankedBottlenecks.map(([name, count]) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-2 py-0.5 text-xs"
              >
                <span className="text-[color:var(--color-fg)]">{name}</span>
                <span className="font-mono tabular-nums text-[color:var(--color-accent)]">
                  {count}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* The table */}
        <div className="mt-6">
          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            <PipelineTable rows={rows} />
          )}
        </div>
      </main>
    </div>
  )
}

function StatsInline({
  total,
  inPipeline,
  warning,
  blocked,
}: {
  total: number
  inPipeline: number
  warning: number
  blocked: number
}) {
  const items = [
    { label: "Total", value: total, tone: "default" as const },
    { label: "Pipeline", value: inPipeline, tone: "default" as const },
    { label: "Warning", value: warning, tone: "warning" as const },
    { label: "Blocked", value: blocked, tone: "danger" as const },
  ]
  return (
    <div className="flex items-end gap-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
          Taiko Launchpad · Pipeline
        </div>
        <h1 className="mt-1 font-serif text-2xl leading-none text-[color:var(--color-fg)]">
          All apps
        </h1>
      </div>
      <div className="flex divide-x divide-[color:var(--color-border)] border border-[color:var(--color-border)]">
        {items.map((s) => (
          <div
            key={s.label}
            className="flex min-w-[5rem] flex-col px-3 py-1.5"
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
              {s.label}
            </span>
            <span
              className={cn(
                "font-mono text-xl tabular-nums",
                s.tone === "danger" && s.value > 0
                  ? "text-[color:var(--color-danger)]"
                  : s.tone === "warning" && s.value > 0
                    ? "text-[color:var(--color-warning)]"
                    : "text-[color:var(--color-fg)]"
              )}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="border border-dashed border-[color:var(--color-border-strong)] py-16 text-center">
      <p className="text-sm text-[color:var(--color-fg-muted)]">
        No apps yet. Submit the first MVP to start tracking it.
      </p>
    </div>
  )
}
