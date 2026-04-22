import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, ExternalLink, Code2 } from "lucide-react"

import { reconcileAppStage } from "@/app/apps/[id]/actions"
import { PhaseActionCard } from "@/components/phase-action-card"
import { PhaseProgress } from "@/components/phase-progress"
import { SeverityDot } from "@/components/severity-dot"
import { StageBadge } from "@/components/stage-badge"
import { TopNav } from "@/components/top-nav"
import type { App, Profile } from "@/lib/db-types"
import type {
  ApprovalRow,
  MarketingChecklist,
} from "@/lib/db-types-extra"
import { computeAppProgress } from "@/lib/progress"
import { MONETIZATION_LABELS, STAGE_LABELS } from "@/lib/stages"
import { createClient } from "@/lib/supabase/server"

type AppDetail = App & {
  pm: Pick<Profile, "id" | "full_name" | "email"> | null
  approvals: ApprovalRow[]
  marketing_checklist: MarketingChecklist[]
}

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Reconcile before reading, so the view reflects auto-advances triggered
  // by actions that happened before this logic existed.
  await reconcileAppStage(id)

  const [{ data: profile }, { data: app }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "id" | "full_name" | "email" | "role">>(),
    supabase
      .from("apps")
      .select(
        `*,
         pm:profiles!apps_pm_id_fkey(id, full_name, email),
         approvals(approver_role, status),
         marketing_checklist(id, app_id, promoted_tweet, proving_ground_article, video, completed_at)`
      )
      .eq("id", id)
      .maybeSingle<AppDetail>(),
  ])

  if (!app) notFound()

  const progress = computeAppProgress({
    app,
    approvals: app.approvals ?? [],
    marketing: app.marketing_checklist?.[0] ?? null,
    pmName: app.pm?.full_name ?? null,
  })

  const actor = {
    isOwner: profile?.id === app.pm?.id,
    isCTO: profile?.role === "cto",
    isCOO: profile?.role === "coo",
    isLegal: profile?.role === "legal_lead",
    isMarketing: profile?.role === "marketing_lead",
    isCofounder: profile?.role === "cofounder",
    isAdmin: profile?.role === "admin",
  }

  const created = new Date(app.created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return (
    <div className="min-h-screen bg-[color:var(--color-bg-subtle)]">
      <TopNav profile={profile ?? null} fallbackEmail={user.email ?? ""} />

      <main className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-10">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
          >
            <ArrowLeft className="size-3.5" />
            Back to pipeline
          </Link>
        </div>

        {/* Header */}
        <header className="mb-6 rounded-lg border border-[color:var(--color-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-[color:var(--color-fg)]">
                  {app.name}
                </h1>
                <StageBadge stage={app.current_stage} />
              </div>
              <p className="mt-2 max-w-3xl text-sm text-[color:var(--color-fg-muted)]">
                {app.value_hypothesis}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
                <DL
                  label="Owner"
                  value={app.pm?.full_name ?? app.pm?.email ?? "—"}
                />
                <DL label="Target user" value={app.target_user} />
                <DL
                  label="Monetization"
                  value={
                    app.monetization_model
                      ? MONETIZATION_LABELS[app.monetization_model]
                      : "Not set"
                  }
                />
                <DL label="Created" value={created} />
              </dl>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <SeverityDot severity={progress.severity} />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                {progress.daysInStage}d in {STAGE_LABELS[app.current_stage]}
              </span>
            </div>
          </div>

          <div className="mt-5">
            <PhaseProgress progress={progress} />
            <div className="mt-1 grid grid-cols-5 gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
              {progress.phases.map((p) => (
                <span key={p.key} className="truncate">
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[color:var(--color-border)] pt-4 text-sm">
            <a
              href={app.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
            >
              <Code2 className="size-3.5" /> Repo
              <ExternalLink className="size-3" />
            </a>
            {app.live_url && (
              <a
                href={app.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
              >
                Live <ExternalLink className="size-3" />
              </a>
            )}
          </div>

          {app.testing_instructions && (
            <div className="mt-4 rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
                Testing instructions
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--color-fg)]">
                {app.testing_instructions}
              </p>
            </div>
          )}
        </header>

        {/* Phase cards */}
        <div className="grid gap-4 lg:grid-cols-2">
          {progress.phases.map((phase) => (
            <PhaseActionCard
              key={phase.key}
              appId={app.id}
              currentStage={app.current_stage}
              phase={phase}
              actor={actor}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

function DL({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-[color:var(--color-fg)]">
        {value}
      </dd>
    </div>
  )
}
