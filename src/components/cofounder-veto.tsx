"use client"

import { useState, useTransition } from "react"
import { AlertOctagon, Loader2, ShieldOff } from "lucide-react"
import { castVeto, liftVeto } from "@/app/apps/[id]/actions"
import type { AppStage } from "@/lib/db-types"
import { cn } from "@/lib/utils"

/**
 * Veto controls for cofounders.
 *
 * Two views:
 *  - When the app is NOT vetoed and is in a vetoable stage (mvp / refining
 *    / ready_for_mainnet), cofounders see a red "Veto app" button that
 *    opens an inline modal asking for a reason.
 *  - When the app IS vetoed, cofounders see "Lift veto". Anyone else sees
 *    nothing — the banner above the page already explains the state.
 *
 * Veto window closes once the app reaches Launched.
 */
const VETOABLE_STAGES: AppStage[] = ["mvp", "refining", "ready_for_mainnet"]

export function CofounderVetoControls({
  appId,
  currentStage,
  isCofounder,
  isVetoed,
}: {
  appId: string
  currentStage: AppStage
  isCofounder: boolean
  isVetoed: boolean
}) {
  if (!isCofounder) return null

  if (isVetoed) {
    return <LiftButton appId={appId} />
  }

  if (!VETOABLE_STAGES.includes(currentStage)) {
    // Cofounder is here but the veto window has closed
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
        Veto window closed
      </span>
    )
  }

  return <VetoButton appId={appId} />
}

function VetoButton({ appId }: { appId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!reason.trim()) {
      setError("A reason is required")
      return
    }
    setError(null)
    startTransition(async () => {
      const r = await castVeto({ appId, reason })
      if (!r.ok) setError(r.error ?? "Failed")
      else {
        setOpen(false)
        setReason("")
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded border border-[color:var(--color-danger)] bg-white px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-danger)] transition hover:bg-[color:var(--color-danger-soft)]"
      >
        <ShieldOff className="size-3.5" />
        Veto app
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger-soft)] p-4">
      <div className="flex items-start gap-2">
        <AlertOctagon className="mt-0.5 size-4 shrink-0 text-[color:var(--color-danger)]" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[color:var(--color-fg)]">
            Veto this app
          </h3>
          <p className="mt-0.5 text-xs text-[color:var(--color-fg-muted)]">
            Pauses the pipeline. The reason is recorded and visible to the
            whole team. You can lift the veto later.
          </p>
        </div>
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Why is this being vetoed? (e.g. legal/compliance concern, brand risk, conflict with roadmap)"
        className="mt-3 block w-full rounded border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-danger)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-danger)]"
      />

      {error && (
        <p className="mt-2 text-xs text-[color:var(--color-danger)]">{error}</p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setReason("")
            setError(null)
          }}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !reason.trim()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded bg-[color:var(--color-danger)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          )}
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Confirm veto
        </button>
      </div>
    </div>
  )
}

function LiftButton({ appId }: { appId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          if (!confirm("Lift the veto on this app? It will be able to advance again.")) return
          startTransition(async () => {
            const r = await liftVeto(appId)
            if (!r.ok) setError(r.error ?? "Failed")
          })
        }}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded border border-[color:var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[color:var(--color-fg-muted)] transition hover:border-[color:var(--color-fg)] hover:text-[color:var(--color-fg)] disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ShieldOff className="size-3.5" />
        )}
        Lift veto
      </button>
      {error && (
        <span className="text-[11px] text-[color:var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  )
}

/**
 * Big red banner shown on the detail page whenever an app is vetoed.
 * Visible to everyone, not just cofounders.
 */
export function VetoedBanner({
  reason,
  vetoedAt,
}: {
  reason: string | null
  vetoedAt: string
}) {
  const date = new Date(vetoedAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return (
    <div className="mb-4 rounded-lg border-2 border-[color:var(--color-danger)] bg-[color:var(--color-danger-soft)] p-4">
      <div className="flex items-start gap-3">
        <ShieldOff className="mt-0.5 size-5 shrink-0 text-[color:var(--color-danger)]" />
        <div className="flex-1">
          <h2 className="text-base font-semibold text-[color:var(--color-danger)]">
            This app has been vetoed
          </h2>
          <p className="mt-1 text-sm text-[color:var(--color-fg)]">
            {reason ?? "No reason was recorded."}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            Vetoed on {date} · The pipeline is paused until a cofounder lifts
            the veto.
          </p>
        </div>
      </div>
    </div>
  )
}
