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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      {/* Editorial background — thin grid of hairlines and one large hero mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[40rem] w-[40rem] rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
        }}
      />

      <section className="relative z-10 grid w-full max-w-5xl gap-14 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        {/* Left — editorial masthead */}
        <div className="animate-fade-in space-y-10">
          <Wordmark size="lg" />

          <div className="space-y-4 max-w-md">
            <p className="font-serif text-2xl leading-snug text-[color:var(--color-fg)]">
              The launch pipeline for everything{" "}
              <span className="italic text-[color:var(--color-accent)]">
                Taiko ships.
              </span>
            </p>
            <p className="text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
              From MVP to mainnet. Approvals, monetization, marketing, and
              adoption — tracked in one place.
            </p>
          </div>

          <div className="hidden lg:block">
            <Masthead />
          </div>
        </div>

        {/* Right — auth card */}
        <div className="animate-fade-in-delayed">
          <div className="relative border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] p-8 sm:p-10">
            <div className="absolute -top-px left-6 right-6 h-px bg-[color:var(--color-accent)]" />
            <div className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-subtle)]">
                01 · Access
              </div>
              <h2 className="font-serif text-2xl text-[color:var(--color-fg)]">
                Sign in
              </h2>
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                Use your <span className="font-mono text-xs text-[color:var(--color-fg)]">@taiko.xyz</span> address. We&apos;ll send you a single-use link.
              </p>
            </div>

            <hr className="hr-editorial my-6" />

            <LoginForm />

            <div className="mt-6 flex items-center justify-between border-t border-[color:var(--color-border)] pt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
              <span>Magic Link</span>
              <span>v0.1</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

/**
 * A thin index of pipeline stages shown under the masthead on desktop.
 * Reinforces the "operations console" identity.
 */
function Masthead() {
  const stages = [
    { code: "MV", label: "MVP" },
    { code: "RM", label: "Ready for Mainnet" },
    { code: "MN", label: "Monetization" },
    { code: "LN", label: "Launched" },
    { code: "RV", label: "60-day Review" },
  ]
  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-fg-subtle)]">
        The Pipeline
      </div>
      <ol className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
        {stages.map((s, i) => (
          <li
            key={s.code}
            className="flex items-center gap-4 py-2.5 font-mono text-xs text-[color:var(--color-fg-muted)]"
          >
            <span className="w-5 text-[color:var(--color-fg-subtle)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-bold tracking-[0.15em] text-[color:var(--color-fg)]">
              {s.code}
            </span>
            <span className="uppercase tracking-[0.15em]">{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
