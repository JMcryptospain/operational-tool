import Link from "next/link"
import { signOut } from "@/app/auth/actions"
import type { Profile } from "@/lib/db-types"
import { Wordmark } from "./wordmark"

/**
 * Slim top bar. 48px tall so the table is visible immediately on load.
 * Wordmark left, user + sign-out right.
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
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-white">
      <div className="mx-auto flex h-12 max-w-[108rem] items-center justify-between gap-6 px-6 lg:px-10">
        <Link href="/" aria-label="Home" className="group">
          <Wordmark size="sm" showDescriptor={false} />
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden flex-col items-end gap-0.5 sm:flex">
            <span className="text-xs text-[color:var(--color-fg)]">{name}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
              {role.replace("_", " ")}
            </span>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded border border-[color:var(--color-border)] bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
