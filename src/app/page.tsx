import Link from "next/link"
import { redirect } from "next/navigation"
import { ExternalLink, Code2 } from "lucide-react"

import { signOut } from "@/app/auth/actions"
import { CreateAppDialog } from "@/components/create-app-dialog"
import { StageBadge } from "@/components/stage-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { App, Profile } from "@/lib/db-types"
import { daysInStage, mvpTimerLevel } from "@/lib/stages"
import { createClient } from "@/lib/supabase/server"

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
> & { pm: Pick<Profile, "full_name" | "email"> | null }

function MvpTimer({ enteredAt }: { enteredAt: string }) {
  const days = daysInStage(enteredAt)
  const level = mvpTimerLevel(days)
  const cls =
    level === "danger"
      ? "text-red-700 dark:text-red-400"
      : level === "warning"
        ? "text-orange-600 dark:text-orange-400"
        : "text-muted-foreground"
  return (
    <span className={cls}>
      {days} {days === 1 ? "day" : "days"} in MVP
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle<Pick<Profile, "full_name" | "email" | "role">>()

  const { data: apps } = await supabase
    .from("apps")
    .select(
      "id, name, value_hypothesis, current_stage, stage_entered_at, repo_url, live_url, pm_id, pm:profiles!apps_pm_id_fkey(full_name, email)"
    )
    .order("created_at", { ascending: false })
    .returns<AppListItem[]>()

  const appList = apps ?? []

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Taiko Launchpad
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium">
              {profile?.full_name ?? profile?.email ?? user.email}
            </span>
            {profile?.role ? (
              <>
                {" · "}
                <span className="font-mono text-xs uppercase tracking-wide">
                  {profile.role}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateAppDialog />
          <form action={signOut}>
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {appList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No apps yet. Click <strong>New app</strong> to submit the first
              MVP.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appList.map((app) => (
            <Link
              key={app.id}
              href={`/apps/${app.id}`}
              className="block transition hover:-translate-y-0.5"
            >
              <Card className="h-full">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <CardTitle className="text-base">{app.name}</CardTitle>
                  <StageBadge stage={app.current_stage} />
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="line-clamp-2 text-muted-foreground">
                    {app.value_hypothesis}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      PM:{" "}
                      {app.pm?.full_name ?? app.pm?.email ?? "—"}
                    </span>
                    {app.current_stage === "mvp" && (
                      <>
                        <span>·</span>
                        <MvpTimer enteredAt={app.stage_entered_at} />
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Code2 className="size-3" />
                      repo
                    </span>
                    {app.live_url && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <ExternalLink className="size-3" />
                        live
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}
