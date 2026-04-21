import { redirect } from "next/navigation"
import { signOut } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The middleware should already redirect here, but double-check.
  if (!user) redirect("/login")

  // Read the profile row (created by the handle_new_user trigger).
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
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
            {profile?.role ? ` · ${profile.role}` : null}
          </p>
        </div>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard (coming soon)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The app pipeline dashboard will live here. For now, you&apos;re
          successfully signed in.
        </CardContent>
      </Card>
    </main>
  )
}
