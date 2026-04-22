"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, Plus } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createApp, type CreateAppState } from "@/app/apps/actions"

const initialState: CreateAppState = { status: "idle" }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--color-accent-strong)] disabled:opacity-50"
    >
      <span>{pending ? "Submitting\u2026" : "Submit as MVP"}</span>
      <ArrowRight className="size-3.5" />
    </button>
  )
}

function Field({
  label,
  optional,
  hint,
  error,
  children,
}: {
  label: string
  optional?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          {label}
        </label>
        {optional && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
            Optional
          </span>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-xs text-[color:var(--color-fg-subtle)]">{hint}</p>
      )}
      {error && (
        <p className="border-l-2 border-[color:var(--color-danger)] pl-2 text-xs text-[color:var(--color-fg)]">
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass =
  "block w-full rounded border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)]"

const textareaClass =
  "block w-full rounded border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] resize-none"

export function CreateAppDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(createApp, initialState)

  const err = (field: string) =>
    state.status === "error" ? state.fieldErrors?.[field] : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded bg-[color:var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[color:var(--color-accent-strong)]"
        >
          <Plus className="size-3.5" />
          <span>New app</span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto gap-0 rounded-lg border border-[color:var(--color-border)] bg-white p-0 sm:max-w-2xl"
      >
        <div className="border-b border-[color:var(--color-border)] px-6 py-5">
          <DialogHeader className="space-y-1">
            <DialogTitle asChild>
              <h2 className="text-lg font-semibold text-[color:var(--color-fg)]">
                Submit a new app
              </h2>
            </DialogTitle>
            <DialogDescription className="text-sm text-[color:var(--color-fg-muted)]">
              Stage 01 · MVP. Your idea should have been green-lit by your
              manager beforehand.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form action={formAction} noValidate className="space-y-5 px-6 py-6">
          <Field label="App name" error={err("name")}>
            <input
              id="name"
              name="name"
              required
              autoComplete="off"
              className={inputClass}
              placeholder="e.g. Taiko Inspector"
            />
          </Field>

          <Field
            label="Value hypothesis"
            hint="One sentence. What does this do, and why does it matter?"
            error={err("value_hypothesis")}
          >
            <textarea
              id="value_hypothesis"
              name="value_hypothesis"
              rows={2}
              required
              className={textareaClass}
            />
          </Field>

          <Field label="Target user" error={err("target_user")}>
            <input
              id="target_user"
              name="target_user"
              required
              className={inputClass}
              placeholder="e.g. Rollup operators"
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="GitHub repo" error={err("repo_url")}>
              <input
                id="repo_url"
                name="repo_url"
                type="url"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                placeholder="https://github.com/…"
                required
                className={inputClass}
              />
            </Field>

            <Field label="Live URL" optional error={err("live_url")}>
              <input
                id="live_url"
                name="live_url"
                type="url"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="Testing instructions"
            optional
            hint="Required before Ready for Mainnet."
          >
            <textarea
              id="testing_instructions"
              name="testing_instructions"
              rows={3}
              className={textareaClass}
              placeholder="How should reviewers test this? Test accounts, sample data, expected flows..."
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Monetization model"
              optional
              hint="Can be set later."
              error={err("monetization_model")}
            >
              <select
                id="monetization_model"
                name="monetization_model"
                className={inputClass}
                defaultValue=""
              >
                <option value="">— Select —</option>
                <option value="free_for_now">Free for now</option>
                <option value="crypto">Pay with crypto</option>
                <option value="fiat_stripe">Pay with FIAT (Stripe)</option>
                <option value="hybrid">Hybrid / other</option>
              </select>
            </Field>

            <Field
              label="Model description"
              optional
              hint="Freemium, pay-per-use, tiers..."
            >
              <input
                id="monetization_description"
                name="monetization_description"
                className={inputClass}
              />
            </Field>
          </div>

          {state.status === "error" && state.message && (
            <p className="border-l-2 border-[color:var(--color-danger)] bg-[color:var(--color-danger-soft)] py-2 pl-3 text-sm text-[color:var(--color-fg)]">
              {state.message}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border)] pt-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-fg-muted)] transition hover:text-[color:var(--color-fg)]"
            >
              Cancel
            </button>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
