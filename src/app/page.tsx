import { redirect } from "next/navigation"

import { CreateAppDialog } from "@/components/create-app-dialog"
import {
  PipelineTable,
  type PipelineRow,
} from "@/components/pipeline-table"
import { TopNav } from "@/components/top-nav"
import type { App, Profile } from "@/lib/db-types"
import type {
  ApprovalRow,
  MarketingChecklist,
} from "@/lib/db-types-extra"
import { computeAppProgress } from "@/lib/progress"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type DashboardApp = Pick<
  App,
  | "id"
  | "name"
  | "current_stage"
  | "stage_entered_at"
  | "monetization_setup_complete"
> & {
  pm: Pick<Profile, "full_name" | "email"> | null
  approvals: ApprovalRow[]
  marketing_checklist: MarketingChecklist[] // array; Supabase returns [] or [row]
}

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
        `id, name, current_stage, stage_entered_at, monetization_setup_complete,
         pm:profiles!apps_pm_id_fkey(full_name, email),
         approvals(approver_role, status),
         marketing_checklist(id, app_id, promoted_tweet, proving_ground_article, video, completed_at)`
      )
      .order("stage_entered_at", { ascending: false })
      .returns<DashboardApp[]>(),
  ])

  const appList = apps ?? []

  const rows: PipelineRow[] = appList.map((app) => {
    const progress = computeAppProgress({
      app,
      approvals: app.approvals ?? [],
      marketing: app.marketing_checklist?.[0] ?? null,
      pmName: app.pm?.full_name ?? null,
    })
    return { id: app.id, name: app.name, progress }
  })

  const blocked = rows.filter((r) => r.progress.severity === "blocked").length
  const warning = rows.filter((r) => r.progress.severity === "warning").length

  // Bottleneck strip — only surface people actively holding things up.
  // For the first milestone this uses generic role labels; once approvals
  // are wired live, computeAppStatus will return real names.
  const bottlenecks = new Map<string, number>()
  for (const r of rows) {
    if (r.progress.severity === "idle" || r.progress.severity === "watching")
      continue
    // We intentionally avoid a heavy join here for the landing; the
    // blockers come from computeAppStatus which is keyed by role label.
  }
  void bottlenecks

  return (
    <div className="min-h-screen">
      <TopNav profile={profile ?? null} fallbackEmail={user.email ?? ""} />

      <main className="mx-auto w-full max-w-[108rem] px-6 py-6 lg:px-10">
        {/* Thin top strip: title + tiny stats + CTA */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[color:var(--color-border)] pb-4">
          <div className="flex items-end gap-8">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
                Taiko Launchpad
              </div>
              <h1 className="mt-1 font-serif text-2xl leading-none text-[color:var(--color-fg)]">
                All apps
              </h1>
            </div>
            <InlineStats
              total={rows.length}
              warning={warning}
              blocked={blocked}
            />
          </div>
          <CreateAppDialog />
        </div>

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

function InlineStats({
  total,
  warning,
  blocked,
}: {
  total: number
  warning: number
  blocked: number
}) {
  const items = [
    { label: "Total", value: total, tone: "default" as const },
    { label: "Warning", value: warning, tone: "warning" as const },
    { label: "Blocked", value: blocked, tone: "danger" as const },
  ]
  return (
    <div className="flex divide-x divide-[color:var(--color-border)] border border-[color:var(--color-border)]">
      {items.map((s) => (
        <div key={s.label} className="flex min-w-[4.5rem] flex-col px-3 py-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
            {s.label}
          </span>
          <span
            className={cn(
              "font-mono text-lg tabular-nums",
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
