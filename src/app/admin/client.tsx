"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Loader2, Mail, Trash2 } from "lucide-react"
import {
  deletePreassignment,
  deleteProfile,
  preassignRole,
  sendAdminTestEmail,
  updateProfileRole,
} from "./actions"
import type { AppRole } from "@/lib/db-types"

/**
 * Roles offered in the admin dropdown. "Admin" is intentionally hidden —
 * it's a privileged ops role granted via SQL, not through the UI.
 * "pm" and "engineer" are legacy enum values we don't offer anymore.
 */
const ROLES: { value: AppRole; label: string }[] = [
  { value: "cofounder", label: "Co-founder" },
  { value: "coo", label: "COO" },
  { value: "cto", label: "CTO" },
  { value: "marketing_lead", label: "MKT Lead" },
  { value: "legal_lead", label: "Legal Lead" },
  { value: "taiko_member", label: "Taiko Member" },
]

/** Full label lookup, including hidden/legacy roles so we can render whatever
 *  the DB has without surprising the user with a blank row. */
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

const selectClass =
  "rounded border border-[color:var(--color-border)] bg-white px-2 py-1 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] disabled:opacity-50"

export function ProfileRoleSelect({
  profileId,
  currentRole,
  isSelf,
}: {
  profileId: string
  currentRole: AppRole
  isSelf: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [value, setValue] = useState<AppRole>(currentRole)

  const change = (next: AppRole) => {
    if (next === value) return
    const previous = value
    setValue(next)
    startTransition(async () => {
      const r = await updateProfileRole({ profileId, role: next })
      if (!r.ok) {
        setValue(previous)
        setError(r.error ?? "Failed")
      } else {
        setError(null)
      }
    })
  }

  const visibleRoles = ROLES.some((r) => r.value === value)
    ? ROLES
    : [{ value, label: ROLE_LABELS[value] ?? value }, ...ROLES]

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending || isSelf}
        onChange={(e) => change(e.target.value as AppRole)}
        className={selectClass}
        title={isSelf ? "You cannot change your own role" : undefined}
      >
        {visibleRoles.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="size-3.5 animate-spin text-[color:var(--color-fg-subtle)]" />}
      {error && (
        <span className="text-[11px] text-[color:var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  )
}

export function PreassignForm() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<AppRole>("taiko_member")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = () => {
    const trimmed = email.trim()
    if (!trimmed) return
    startTransition(async () => {
      const r = await preassignRole({ email: trimmed, role })
      if (!r.ok) {
        setError(r.error ?? "Failed")
        setSuccess(null)
      } else {
        setEmail("")
        setRole("taiko_member")
        setError(null)
        setSuccess(
          `Saved ${trimmed} as ${ROLE_LABELS[role] ?? role}`
        )
      }
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="email"
          className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@taiko.xyz"
          className="min-w-60 rounded border border-[color:var(--color-border)] bg-white px-3 py-1.5 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="role"
          className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]"
        >
          Role
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as AppRole)}
          className={selectClass}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending || !email.trim()}
        className="inline-flex items-center gap-1.5 rounded bg-[color:var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[color:var(--color-accent-strong)] disabled:opacity-50"
      >
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Pre-assign
      </button>
      {error && (
        <span className="text-xs text-[color:var(--color-danger)]">{error}</span>
      )}
      {success && !error && (
        <span className="text-xs text-[color:var(--color-success)]">
          {success}
        </span>
      )}
    </form>
  )
}

export function SendTestEmailButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<
    { kind: "ok" } | { kind: "error"; error: string } | null
  >(null)

  const send = () => {
    setResult(null)
    startTransition(async () => {
      const r = await sendAdminTestEmail()
      if (r.ok) setResult({ kind: "ok" })
      else setResult({ kind: "error", error: r.error ?? "Failed" })
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={send}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded border border-[color:var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-fg)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Mail className="size-3.5" />
        )}
        Send test email
      </button>
      {result?.kind === "ok" && (
        <span className="inline-flex items-center gap-1 text-xs text-[color:var(--color-success)]">
          <CheckCircle2 className="size-3.5" />
          Sent. Check your inbox.
        </span>
      )}
      {result?.kind === "error" && (
        <span className="text-xs text-[color:var(--color-danger)]">
          {result.error}
        </span>
      )}
    </div>
  )
}

/**
 * Inline "Remove" affordance shown next to each user. Asks for explicit
 * confirmation, and surfaces the FK error inline if the user owns apps.
 */
export function DeleteProfileButton({
  profileId,
  email,
  isSelf,
}: {
  profileId: string
  email: string
  isSelf: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (isSelf) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `Remove ${email}?\n\nThe user can sign back in any time and will get a fresh profile (Taiko Member role unless pre-assigned).`
            )
          )
            return
          startTransition(async () => {
            const r = await deleteProfile(profileId)
            if (!r.ok) setError(r.error ?? "Failed")
          })
        }}
        className="inline-flex items-center gap-1 text-xs text-[color:var(--color-fg-subtle)] transition hover:text-[color:var(--color-danger)] disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Trash2 className="size-3" />
        )}
        Remove
      </button>
      {error && (
        <span className="max-w-xs text-right text-[10px] text-[color:var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  )
}

export function PreassignRow({
  email,
  role,
}: {
  email: string
  role: AppRole
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const remove = () => {
    if (!confirm(`Remove pre-assignment for ${email}?`)) return
    startTransition(async () => {
      const r = await deletePreassignment(email)
      if (!r.ok) setError(r.error ?? "Failed")
    })
  }

  const label = ROLE_LABELS[role] ?? role

  return (
    <tr className="border-b border-[color:var(--color-border)] last:border-b-0">
      <td className="px-5 py-2.5 text-[color:var(--color-fg)]">{email}</td>
      <td className="px-5 py-2.5 text-[color:var(--color-fg-muted)]">{label}</td>
      <td className="px-5 py-2.5 text-right">
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="inline-flex items-center gap-1 text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-danger)] disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Trash2 className="size-3" />
          )}
          Remove
        </button>
        {error && (
          <div className="mt-0.5 text-[11px] text-[color:var(--color-danger)]">
            {error}
          </div>
        )}
      </td>
    </tr>
  )
}
