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
  | "created_at"
  | "monetization_setup_complete"
  | "owner_tested_at"
> & {
  pm: Pick<Profile, "full_name" | "email"> | null
  approvals: ApprovalRow[]
  marketing_checklist: MarketingChecklist[]
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
      .select("full_name, email, role, is_admin")
      .eq("id", user.id)
      .maybeSingle<
        Pick<Profile, "full_name" | "email" | "role" | "is_admin">
      >(),
    supabase
      .from("apps")
      .select(
        `id, name, current_stage, stage_entered_at, created_at, monetization_setup_complete, owner_tested_at,
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
    return {
      id: app.id,
      name: app.name,
      pm_name: app.pm?.full_name ?? app.pm?.email ?? "",
      days_in_stage: progress.daysInStage,
      progress,
    }
  })

  const blocked = rows.filter((r) => r.progress.severity === "blocked").length
  const warning = rows.filter((r) => r.progress.severity === "warning").length

  return (
    <div className="min-h-screen bg-[color:var(--color-bg-subtle)]">
      <TopNav profile={profile ?? null} fallbackEmail={user.email ?? ""} />

      <main className="mx-auto w-full max-w-[108rem] px-6 py-4 lg:px-10">
        {/* Compact single-line header: title · mini stats · CTA */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-5">
            <h1 className="text-sm font-semibold text-[color:var(--color-fg)]">
              All apps
            </h1>
            <InlineStats
              total={rows.length}
              warning={warning}
              blocked={blocked}
            />
          </div>
          <CreateAppDialog />
        </div>

        {rows.length === 0 ? <EmptyState /> : <PipelineTable rows={rows} />}
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
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
      <span className="text-[color:var(--color-fg-muted)]">
        {total} {total === 1 ? "app" : "apps"}
      </span>
      <span className="text-[color:var(--color-border-strong)]">·</span>
      <Stat label="Warning" value={warning} tone="warning" />
      <Stat label="Blocked" value={blocked} tone="danger" />
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "warning" | "danger"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        value === 0 && "text-[color:var(--color-fg-subtle)]",
        value > 0 && tone === "warning" && "text-[color:var(--color-warning)]",
        value > 0 && tone === "danger" && "text-[color:var(--color-danger)]"
      )}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  )
}

function EmptyState() {
  return (
    <div className="rounded border border-dashed border-[color:var(--color-border-strong)] bg-white py-16 text-center">
      <p className="text-sm text-[color:var(--color-fg-muted)]">
        No apps yet. Submit the first MVP to start tracking it.
      </p>
    </div>
  )
}
