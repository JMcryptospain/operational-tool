import Link from "next/link"
import { Settings } from "lucide-react"
import { signOut } from "@/app/auth/actions"
import type { AppRole, Profile } from "@/lib/db-types"
import { Wordmark } from "./wordmark"

/**
 * Slim top bar. 48px tall so the table is visible immediately on load.
 * Wordmark left, user + sign-out right.
 *
 * Admin is a separate flag from the operational role — we show the Admin
 * link based on `is_admin`, not the role itself.
 */
const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  cofounder: "Co-founder",
  coo: "COO",
  cto: "CTO",
  marketing_lead: "MKT Lead",
  legal_lead: "Legal Lead",
  taiko_member: "Taiko Member",
  pm: "Taiko Member",
  engineer: "Taiko Member",
}

export function TopNav({
  profile,
  fallbackEmail,
}: {
  profile:
    | Pick<Profile, "full_name" | "email" | "role" | "is_admin">
    | null
  fallbackEmail: string
}) {
  const name = profile?.full_name ?? profile?.email ?? fallbackEmail
  const role = profile?.role ?? "taiko_member"
  const isAdmin = Boolean(profile?.is_admin)

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-white">
      <div className="mx-auto flex h-12 max-w-[108rem] items-center justify-between gap-6 px-6 lg:px-10">
        <Link href="/" aria-label="Home" className="group">
          <Wordmark size="sm" showDescriptor={false} />
        </Link>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded border border-[color:var(--color-border)] bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
            >
              <Settings className="size-3" />
              Admin
            </Link>
          )}

          <div className="hidden flex-col items-end gap-0.5 sm:flex">
            <span className="text-xs text-[color:var(--color-fg)]">{name}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
              {ROLE_LABELS[role]}
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
