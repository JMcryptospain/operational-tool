"use client"

import { useTransition, useState } from "react"
import { Check, X, Loader2, AlertCircle, ArrowRight } from "lucide-react"
import type { Phase } from "@/lib/progress"
import {
  markOwnerTested,
  markLiveOnMainnet,
  setMonetizationOperative,
  castApproval,
  advanceStage,
  setMarketingCheck,
} from "@/app/apps/[id]/actions"
import type { AppStage } from "@/lib/db-types"
import { cn } from "@/lib/utils"

type ActorCapabilities = {
  isOwner: boolean
  isCTO: boolean
  isCOO: boolean
  isLegal: boolean
  isMarketing: boolean
  isCofounder: boolean
  isAdmin: boolean
}

/**
 * The per-phase card on the detail page. Shows the phase title, check
 * status, and the CTAs that apply to the current actor. Read-only for
 * anyone who can't act on the phase.
 */
export function PhaseActionCard({
  appId,
  currentStage,
  phase,
  actor,
}: {
  appId: string
  currentStage: AppStage
  phase: Phase
  actor: ActorCapabilities
}) {
  const isActive = phase.state === "active"
  const isCompleted = phase.state === "completed"

  return (
    <section
      className={cn(
        "rounded-lg border bg-white p-5",
        isActive
          ? "border-[color:var(--color-accent)]"
          : "border-[color:var(--color-border)]"
      )}
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <div
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.22em]",
              isCompleted && "text-[color:var(--color-success)]",
              isActive && "text-[color:var(--color-accent)]",
              phase.state === "pending" && "text-[color:var(--color-fg-subtle)]"
            )}
          >
            {phase.state}
          </div>
          <h2 className="mt-0.5 text-lg font-semibold text-[color:var(--color-fg)]">
            {phase.label}
          </h2>
        </div>
      </header>

      <div className="space-y-3">
        {phase.checks.map((check) => (
          <CheckRow
            key={check.id}
            appId={appId}
            phaseKey={phase.key}
            check={check}
            actor={actor}
          />
        ))}
      </div>

      {isActive && (
        <AdvanceButton
          appId={appId}
          currentStage={currentStage}
          phase={phase}
          actor={actor}
        />
      )}
    </section>
  )
}

function CheckRow({
  appId,
  phaseKey,
  check,
  actor,
}: {
  appId: string
  phaseKey: Phase["key"]
  check: Phase["checks"][number]
  actor: ActorCapabilities
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-3 py-2.5">
      <div className="flex items-start gap-2">
        <StatusIcon state={check.state} />
        <div className="text-sm">
          <div className="font-medium text-[color:var(--color-fg)]">
            {check.title ?? check.label}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
            {check.state.replace("_", " ")}
          </div>
        </div>
      </div>

      <CheckAction
        appId={appId}
        phaseKey={phaseKey}
        check={check}
        actor={actor}
      />
    </div>
  )
}

function StatusIcon({ state }: { state: Phase["checks"][number]["state"] }) {
  const cls =
    state === "done" || state === "approved"
      ? "bg-[color:var(--color-success)] border-[color:var(--color-success)] text-white"
      : state === "pending"
        ? "bg-[color:var(--color-warning-soft)] border-[color:var(--color-warning)] text-[color:var(--color-warning)]"
        : state === "rejected" || state === "vetoed"
          ? "bg-[color:var(--color-danger)] border-[color:var(--color-danger)] text-white"
          : "bg-white border-[color:var(--color-border-strong)] text-[color:var(--color-fg-subtle)]"
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
        cls
      )}
    >
      {state === "done" || state === "approved" ? (
        <Check className="size-2.5" strokeWidth={3} />
      ) : state === "rejected" || state === "vetoed" ? (
        <X className="size-2.5" strokeWidth={3} />
      ) : state === "pending" ? (
        <span className="block h-1 w-1 rounded-full bg-current" />
      ) : null}
    </span>
  )
}

function CheckAction({
  appId,
  phaseKey,
  check,
  actor,
}: {
  appId: string
  phaseKey: Phase["key"]
  check: Phase["checks"][number]
  actor: ActorCapabilities
}) {
  // Map each check id to the actor who can flip it.
  if (phaseKey === "refining") {
    if (check.id === "owner_tested")
      return (
        <AsyncButton
          disabled={!actor.isOwner}
          disabledHint="Only the owner can confirm"
          done={check.state === "done"}
          onClick={() => markOwnerTested(appId)}
          label="I've tested it"
          confirmLabel="Done"
        />
      )
    if (check.id === "legal")
      return (
        <ApprovalButtons
          disabled={!actor.isLegal}
          current={check.state}
          onDecide={(decision) =>
            castApproval({
              appId,
              approverRole: "legal_lead",
              decision,
            })
          }
        />
      )
    if (check.id === "monet")
      return (
        <AsyncButton
          disabled={!actor.isLegal && !actor.isOwner}
          disabledHint="Jonathan or the owner"
          done={check.state === "done"}
          onClick={() => setMonetizationOperative(appId, true)}
          onUndo={() => setMonetizationOperative(appId, false)}
          label="Mark ready"
          confirmLabel="Ready"
        />
      )
  }
  if (phaseKey === "rfm") {
    if (check.id === "cto")
      return (
        <ApprovalButtons
          disabled={!actor.isCTO}
          current={check.state}
          onDecide={(decision) =>
            castApproval({ appId, approverRole: "cto", decision })
          }
        />
      )
    if (check.id === "coo")
      return (
        <ApprovalButtons
          disabled={!actor.isCOO}
          current={check.state}
          onDecide={(decision) =>
            castApproval({ appId, approverRole: "coo", decision })
          }
        />
      )
  }
  if (phaseKey === "launched" && check.id === "live") {
    return (
      <AsyncButton
        disabled={!actor.isOwner}
        disabledHint="Only the owner can confirm"
        done={check.state === "done"}
        onClick={() => markLiveOnMainnet(appId, true)}
        onUndo={() => markLiveOnMainnet(appId, false)}
        label="Mark live on mainnet"
        confirmLabel="Live"
      />
    )
  }
  if (phaseKey === "mkt") {
    const field =
      check.id === "tweet"
        ? "promoted_tweet"
        : check.id === "article"
          ? "proving_ground_article"
          : check.id === "video"
            ? "video"
            : check.id === "ai_listings"
              ? "ai_product_listings"
              : check.id === "media"
                ? "media_pitch"
                : null
    if (field) {
      return (
        <AsyncButton
          disabled={!actor.isMarketing}
          disabledHint="Marketing Lead"
          done={check.state === "done"}
          onClick={() => setMarketingCheck({ appId, field, value: true })}
          onUndo={() =>
            setMarketingCheck({ appId, field, value: false })
          }
          label="Mark done"
          confirmLabel="Done"
        />
      )
    }
  }
  return null
}

function AsyncButton({
  onClick,
  onUndo,
  label,
  confirmLabel,
  done,
  disabled,
  disabledHint,
}: {
  onClick: () => Promise<{ ok: boolean; error?: string }>
  onUndo?: () => Promise<{ ok: boolean; error?: string }>
  label: string
  confirmLabel: string
  done: boolean
  disabled?: boolean
  disabledHint?: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (done) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-[color:var(--color-success-soft)] px-2 py-1 text-xs font-medium text-[color:var(--color-success)]">
          <Check className="size-3" strokeWidth={3} />
          {confirmLabel}
        </span>
        {onUndo && !disabled && (
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const r = await onUndo()
                if (!r.ok) setError(r.error ?? "Failed")
              })
            }
            className="text-xs text-[color:var(--color-fg-subtle)] underline underline-offset-2 hover:text-[color:var(--color-fg)]"
          >
            Undo
          </button>
        )}
      </div>
    )
  }

  if (disabled) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
        {disabledHint ?? "—"}
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await onClick()
            if (!r.ok) setError(r.error ?? "Failed")
          })
        }
        className="inline-flex items-center gap-1.5 rounded bg-[color:var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[color:var(--color-accent-strong)] disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : null}
        {label}
      </button>
      {error && (
        <span className="inline-flex items-center gap-1 text-[10px] text-[color:var(--color-danger)]">
          <AlertCircle className="size-3" />
          {error}
        </span>
      )}
    </div>
  )
}

function ApprovalButtons({
  disabled,
  current,
  onDecide,
}: {
  disabled: boolean
  current: Phase["checks"][number]["state"]
  onDecide: (
    decision: "approved" | "rejected"
  ) => Promise<{ ok: boolean; error?: string }>
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (current === "approved") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-[color:var(--color-success-soft)] px-2 py-1 text-xs font-medium text-[color:var(--color-success)]">
          <Check className="size-3" strokeWidth={3} /> Approved
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const r = await onDecide("rejected")
                if (!r.ok) setError(r.error ?? "Failed")
              })
            }
            className="text-xs text-[color:var(--color-fg-subtle)] underline underline-offset-2 hover:text-[color:var(--color-fg)]"
          >
            Change
          </button>
        )}
      </div>
    )
  }

  if (current === "rejected") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-[color:var(--color-danger-soft)] px-2 py-1 text-xs font-medium text-[color:var(--color-danger)]">
          <X className="size-3" strokeWidth={3} /> Rejected
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const r = await onDecide("approved")
                if (!r.ok) setError(r.error ?? "Failed")
              })
            }
            className="text-xs text-[color:var(--color-fg-subtle)] underline underline-offset-2 hover:text-[color:var(--color-fg)]"
          >
            Change
          </button>
        )}
      </div>
    )
  }

  if (disabled) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
        Not your call
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await onDecide("approved")
              if (!r.ok) setError(r.error ?? "Failed")
            })
          }
          className="inline-flex items-center gap-1 rounded border border-[color:var(--color-success)] bg-white px-2.5 py-1 text-xs font-medium text-[color:var(--color-success)] transition hover:bg-[color:var(--color-success-soft)] disabled:opacity-50"
        >
          <Check className="size-3" strokeWidth={3} />
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await onDecide("rejected")
              if (!r.ok) setError(r.error ?? "Failed")
            })
          }
          className="inline-flex items-center gap-1 rounded border border-[color:var(--color-border-strong)] bg-white px-2.5 py-1 text-xs font-medium text-[color:var(--color-fg-muted)] transition hover:border-[color:var(--color-danger)] hover:text-[color:var(--color-danger)] disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {error && (
        <span className="inline-flex items-center gap-1 text-[10px] text-[color:var(--color-danger)]">
          <AlertCircle className="size-3" />
          {error}
        </span>
      )}
    </div>
  )
}

const NEXT_STAGE: Partial<Record<Phase["key"], AppStage>> = {
  mvp: "refining",
  refining: "ready_for_mainnet",
  rfm: "launched",
}

function AdvanceButton({
  appId,
  currentStage,
  phase,
  actor,
}: {
  appId: string
  currentStage: AppStage
  phase: Phase
  actor: ActorCapabilities
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const nextStage = NEXT_STAGE[phase.key]
  if (!nextStage) return null

  // All checks of this phase must be done / approved
  const allDone = phase.checks.every(
    (c) => c.state === "done" || c.state === "approved"
  )

  // Who is allowed to push advance: owner, privileged roles, admin.
  const allowed = actor.isOwner || actor.isCTO || actor.isCOO

  if (!allowed && !allDone) return null

  return (
    <div className="mt-5 flex flex-col items-end gap-1 border-t border-[color:var(--color-border)] pt-4">
      <button
        type="button"
        disabled={!allDone || pending || !allowed}
        onClick={() =>
          startTransition(async () => {
            const r = await advanceStage({ appId, toStage: nextStage })
            if (!r.ok) setError(r.error ?? "Failed")
          })
        }
        className="inline-flex items-center gap-2 rounded bg-[color:var(--color-fg)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Advance to {NEXT_LABEL[nextStage] ?? nextStage}
        <ArrowRight className="size-3" />
      </button>
      {!allDone && (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          Finish all checks to enable
        </span>
      )}
      {error && (
        <span className="inline-flex items-center gap-1 text-[10px] text-[color:var(--color-danger)]">
          <AlertCircle className="size-3" />
          {error}
        </span>
      )}
    </div>
  )
}

const NEXT_LABEL: Partial<Record<AppStage, string>> = {
  refining: "Refining",
  ready_for_mainnet: "Ready for Mainnet",
  launched: "Launched",
}
