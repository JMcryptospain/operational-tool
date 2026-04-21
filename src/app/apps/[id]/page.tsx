import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, ExternalLink, Code2 } from "lucide-react"

import { StageBadge } from "@/components/stage-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { App, Profile } from "@/lib/db-types"
import { MONETIZATION_LABELS, daysInStage, mvpTimerLevel } from "@/lib/stages"
import { createClient } from "@/lib/supabase/server"

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

  const { data: app } = await supabase
    .from("apps")
    .select(
      "*, pm:profiles!apps_pm_id_fkey(id, full_name, email)"
    )
    .eq("id", id)
    .maybeSingle<AppDetail>()

  if (!app) notFound()

  const days = daysInStage(app.stage_entered_at)
  const timerLevel =
    app.current_stage === "mvp" ? mvpTimerLevel(days) : "ok"

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {app.name}
          </h1>
          <StageBadge stage={app.current_stage} />
        </div>
        <p className="text-muted-foreground">{app.value_hypothesis}</p>

        {app.current_stage === "mvp" && timerLevel !== "ok" && (
          <div
            className={
              timerLevel === "danger"
                ? "rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
                : "rounded-md bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-950/40 dark:text-orange-200"
            }
          >
            {timerLevel === "danger"
              ? `This app has been in MVP for ${days} days. Decide offline whether to promote or drop.`
              : `This app has been in MVP for ${days} days. Time to decide on next steps.`}
          </div>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-muted-foreground">PM</div>
            <div className="font-medium">
              {app.pm?.full_name ?? app.pm?.email ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Target user
            </div>
            <div className="font-medium">{app.target_user}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Days in stage
            </div>
            <div className="font-medium">{days}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Monetization
            </div>
            <div className="font-medium">
              {app.monetization_model
                ? MONETIZATION_LABELS[app.monetization_model]
                : "Not set"}
              {app.monetization_description ? (
                <span className="font-normal text-muted-foreground">
                  {" — "}
                  {app.monetization_description}
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Code2 className="size-4 text-muted-foreground" />
            <a
              href={app.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline-offset-4 hover:underline"
            >
              {app.repo_url}
            </a>
          </div>
          {app.live_url ? (
            <div className="flex items-center gap-2">
              <ExternalLink className="size-4 text-muted-foreground" />
              <a
                href={app.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline-offset-4 hover:underline"
              >
                {app.live_url}
              </a>
            </div>
          ) : (
            <div className="text-muted-foreground">
              No live URL yet — add one before moving to Ready for Mainnet.
            </div>
          )}
        </CardContent>
      </Card>

      {app.testing_instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Testing instructions</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {app.testing_instructions}
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next steps</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Approvals, feedback threads, and stage transitions will appear here
          as we build out Ready for Mainnet.
        </CardContent>
      </Card>
    </main>
  )
}
