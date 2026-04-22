import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Wordmark } from "@/components/wordmark"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect("/")

  return (
    <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg-subtle)] px-6 py-10">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex">
            <Wordmark size="md" showDescriptor={false} />
          </div>
          <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
            Internal app pipeline. Sign in with your Taiko email.
          </p>
        </div>

        <div className="rounded-lg border border-[color:var(--color-border)] bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
          @taiko.xyz only · magic link
        </p>
      </div>
    </main>
  )
}
