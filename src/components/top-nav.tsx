import Link from "next/link"
import { signOut } from "@/app/auth/actions"
import type { Profile } from "@/lib/db-types"
import { Wordmark } from "./wordmark"

/**
 * Top bar shown on every authenticated page. Keeps the wordmark tight and
 * puts user identity + sign-out on the right with monospace treatment.
 */
export function TopNav({
  profile,
  fallbackEmail,
}: {
  profile: Pick<Profile, "full_name" | "email" | "role"> | null
  fallbackEmail: string
}) {
  const name = profile?.full_name ?? profile?.email ?? fallbackEmail
  const role = profile?.role ?? "engineer"

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/85 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-bg)]/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
        <Link href="/" aria-label="Home" className="group">
          <Wordmark size="sm" />
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden flex-col items-end gap-0.5 sm:flex">
            <span className="text-sm text-[color:var(--color-fg)]">
              {name}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
              {role.replace("_", " ")}
            </span>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="group flex items-center gap-2 border border-[color:var(--color-border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
            >
              <span className="inline-block h-1 w-1 rounded-full bg-[color:var(--color-fg-subtle)] transition group-hover:bg-[color:var(--color-accent)]" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
