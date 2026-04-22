"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { sendMagicLink, type LoginState } from "./actions"

const initialState: LoginState = { status: "idle" }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center justify-center gap-2 rounded bg-[color:var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[color:var(--color-accent-strong)] disabled:opacity-50"
    >
      <span>{pending ? "Sending\u2026" : "Send magic link"}</span>
      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(sendMagicLink, initialState)

  if (state.status === "sent") {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 rounded border border-[color:var(--color-success)]/40 bg-[color:var(--color-success-soft)] p-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--color-success)]" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-[color:var(--color-fg)]">
              Check your inbox.
            </p>
            <p className="text-[color:var(--color-fg-muted)]">
              {state.message?.replace("Magic link sent to ", "Link sent to ")}
            </p>
          </div>
        </div>
        <p className="text-xs text-[color:var(--color-fg-subtle)]">
          The link expires in 60 minutes.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-xs font-medium text-[color:var(--color-fg)]"
        >
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@taiko.xyz"
          autoComplete="email"
          required
          className="block w-full rounded border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"
        />
      </div>

      <SubmitButton />

      {state.status === "error" && (
        <p
          className="rounded border-l-2 border-[color:var(--color-danger)] bg-[color:var(--color-danger-soft)] py-2 pl-3 text-xs text-[color:var(--color-fg)]"
          role="alert"
        >
          {state.message}
        </p>
      )}
    </form>
  )
}
