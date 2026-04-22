"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { sendMagicLink, type LoginState } from "./actions"

const initialState: LoginState = { status: "idle" }

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="group relative flex w-full items-center justify-between gap-3 border border-[color:var(--color-fg)] bg-[color:var(--color-fg)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-bg)] transition hover:bg-[color:var(--color-accent)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent-fg)] disabled:opacity-50"
    >
      <span>{pending ? "Sending..." : "Send magic link"}</span>
      <ArrowRight className="size-4 transition group-hover:translate-x-1" />
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(sendMagicLink, initialState)

  if (state.status === "sent") {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 border border-[color:var(--color-success)]/30 bg-[color:var(--color-success-soft)] p-4">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--color-success)]" />
          <div className="space-y-1 text-sm">
            <p className="text-[color:var(--color-fg)]">
              Check your inbox.
            </p>
            <p className="text-[color:var(--color-fg-muted)]">
              {state.message?.replace("Magic link sent to ", "Link sent to ")}
            </p>
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
          The link expires in 60 minutes.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)]"
        >
          <span>Work email</span>
          <span className="text-[color:var(--color-fg-subtle)]">@taiko.xyz</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@taiko.xyz"
          autoComplete="email"
          required
          className="block w-full border-0 border-b border-[color:var(--color-border-strong)] bg-transparent px-0 py-2.5 text-base text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-0"
        />
      </div>

      <SubmitButton />

      {state.status === "error" && (
        <p className="border-l-2 border-[color:var(--color-danger)] bg-[color:var(--color-danger-soft)] py-2 pl-3 text-xs text-[color:var(--color-fg)]" role="alert">
          {state.message}
        </p>
      )}
    </form>
  )
}
