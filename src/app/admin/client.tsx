"use client"

import { useState, useTransition } from "react"
import { Loader2, Trash2 } from "lucide-react"
import {
  deletePreassignment,
  preassignRole,
  updateProfileRole,
} from "./actions"
import type { AppRole } from "@/lib/db-types"

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "cto", label: "CTO" },
  { value: "coo", label: "COO" },
  { value: "legal_lead", label: "Legal Lead" },
  { value: "marketing_lead", label: "Marketing Lead" },
  { value: "cofounder", label: "Cofounder" },
  { value: "pm", label: "Product Manager" },
  { value: "engineer", label: "Engineer" },
]

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

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending || isSelf}
        onChange={(e) => change(e.target.value as AppRole)}
        className={selectClass}
        title={isSelf ? "You cannot change your own role" : undefined}
      >
        {ROLES.map((r) => (
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
  const [role, setRole] = useState<AppRole>("engineer")
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
        setRole("engineer")
        setError(null)
        setSuccess(`Saved ${trimmed} as ${role}`)
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

  const label = ROLES.find((r) => r.value === role)?.label ?? role

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
