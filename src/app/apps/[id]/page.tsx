import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Code2, ExternalLink } from "lucide-react"

import { PipelineTracker } from "@/components/pipeline-tracker"
import { SeverityDot } from "@/components/severity-dot"
import { StageBadge } from "@/components/stage-badge"
import { TopNav } from "@/components/top-nav"
import type { App, Profile } from "@/lib/db-types"
import { computeAppStatus } from "@/lib/pipeline"
import { MONETIZATION_LABELS } from "@/lib/stages"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

type AppDetail = App & {
  pm: Pick<Profile, "id" | "full_name" | "email"> | null
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

  const [{ data: profile }, { data: app }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", user.id)
      .maybeSingle<Pick<Profile, "full_name" | "email" | "role">>(),
    supabase
      .from("apps")
      .select("*, pm:profiles!apps_pm_id_fkey(id, full_name, email)")
      .eq("id", id)
      .maybeSingle<AppDetail>(),
  ])

  if (!app) notFound()

  const status = computeAppStatus({
    current_stage: app.current_stage,
    stage_entered_at: app.stage_entered_at,
    pm: app.pm,
  })

  const created = new Date(app.created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return (
    <div className="min-h-screen">
      <TopNav profile={profile ?? null} fallbackEmail={user.email ?? ""} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
        {/* Back */}
        <div className="mb-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-muted)] transition hover:text-[color:var(--color-accent)]"
          >
            <ArrowLeft className="size-3 transition group-hover:-translate-x-1" />
            Back to pipeline
          </Link>
        </div>

        {/* Article masthead */}
        <article className="animate-fade-in space-y-10">
          <header className="space-y-6">
            {/* Eyebrow meta-strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
              <span translate="no">
                ID · <span className="font-mono">{app.id.slice(0, 8)}</span>
              </span>
              <span>Filed · {created}</span>
              <span>
                Owner ·{" "}
                <span className="text-[color:var(--color-fg-muted)]">
                  {app.pm?.full_name ?? app.pm?.email ?? "—"}
                </span>
              </span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-[color:var(--color-fg)] sm:text-6xl">
              {app.name}
            </h1>

            {/* Lead paragraph */}
            <p className="max-w-3xl font-serif text-2xl leading-snug text-[color:var(--color-fg-muted)] italic">
              {app.value_hypothesis}
            </p>

            {/* Stage row */}
            <div className="flex flex-wrap items-center gap-4 border-y border-[color:var(--color-border)] py-4">
              <StageBadge stage={app.current_stage} variant="prominent" />
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]">
                <SeverityDot severity={status.severity} />
                {status.daysInStage}d in stage
              </span>
              {status.blockers.length > 0 && (
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
                  Waiting on{" "}
                  <span className="text-[color:var(--color-fg)]">
                    {status.blockers.join(", ")}
                  </span>
                </span>
              )}
            </div>

            {/* Status banner when not idle */}
            {(status.severity === "warning" ||
              status.severity === "blocked") && (
              <div
                className={cn(
                  "border-l-2 bg-[color:var(--color-bg-elevated)] p-4",
                  status.severity === "blocked"
                    ? "border-[color:var(--color-danger)]"
                    : "border-[color:var(--color-warning)]"
                )}
              >
                <div
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.25em]",
                    status.severity === "blocked"
                      ? "text-[color:var(--color-danger)]"
                      : "text-[color:var(--color-warning)]"
                  )}
                >
                  {status.severity === "blocked" ? "Blocked" : "Warning"}
                </div>
                <p className="mt-1 text-sm text-[color:var(--color-fg)]">
                  {status.reason}
                  {status.blockers.length > 0 && (
                    <>
                      . Action expected from{" "}
                      <span className="font-medium">
                        {status.blockers.join(", ")}
                      </span>
                      .
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Pipeline tracker */}
            <div className="pt-2">
              <PipelineTracker current={app.current_stage} />
            </div>
          </header>

          {/* Body sections — editorial layout with sidenote-style meta */}
          <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
            <div className="space-y-10">
              <Section title="Overview">
                <dl className="grid gap-5 sm:grid-cols-2">
                  <DefPair
                    label="Target user"
                    value={app.target_user}
                  />
                  <DefPair
                    label="Monetization"
                    value={
                      app.monetization_model
                        ? MONETIZATION_LABELS[app.monetization_model]
                        : "Not set"
                    }
                    detail={app.monetization_description ?? undefined}
                  />
                </dl>
              </Section>

              <Section title="Links">
                <ul className="space-y-3">
                  <LinkRow
                    icon={<Code2 className="size-4" />}
                    label="Repo"
                    href={app.repo_url}
                  />
                  {app.live_url ? (
                    <LinkRow
                      icon={<ExternalLink className="size-4" />}
                      label="Live"
                      href={app.live_url}
                    />
                  ) : (
                    <li className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
                      No live URL yet · required before Ready for Mainnet
                    </li>
                  )}
                </ul>
              </Section>

              {app.testing_instructions && (
                <Section title="Testing instructions">
                  <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-[color:var(--color-fg)]">
                    {app.testing_instructions}
                  </p>
                </Section>
              )}

            </div>

            {/* Sidenote */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6 border-l border-[color:var(--color-border)] pl-6">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
                    Created
                  </div>
                  <div className="font-serif text-2xl text-[color:var(--color-fg)]">
                    {created}
                  </div>
                </div>
                <hr className="hr-editorial" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
                    Stage
                  </div>
                  <div className="pt-1">
                    <StageBadge stage={app.current_stage} />
                  </div>
                </div>
                <hr className="hr-editorial" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
                    Days in stage
                  </div>
                  <div className="font-serif text-2xl tabular-nums text-[color:var(--color-fg)]">
                    {status.daysInStage}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </article>
      </main>
    </div>
  )
}

/* ------------------------------- components ------------------------------- */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline gap-4 border-b border-[color:var(--color-border)] pb-2">
        <h2 className="font-serif text-2xl text-[color:var(--color-fg)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function DefPair({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd className="text-base text-[color:var(--color-fg)]">
        {value}
        {detail && (
          <span className="block text-sm text-[color:var(--color-fg-muted)]">
            {detail}
          </span>
        )}
      </dd>
    </div>
  )
}

function LinkRow({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode
  label: string
  href: string
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-4 py-3 transition hover:border-[color:var(--color-accent)]"
      >
        <span className="text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-accent)]">
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
          {label}
        </span>
        <span className="flex-1 truncate text-sm text-[color:var(--color-fg)]">
          {href}
        </span>
        <ExternalLink className="size-3.5 text-[color:var(--color-fg-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[color:var(--color-accent)]" />
      </a>
    </li>
  )
}
