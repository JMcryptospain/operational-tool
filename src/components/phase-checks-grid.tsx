import { Check as CheckIcon, Minus, X } from "lucide-react"
import type { Check, CheckState, Phase } from "@/lib/progress"
import { cn } from "@/lib/utils"

/**
 * The expanded panel below a row. Shows the four phases side-by-side with
 * their sub-checks stacked vertically. Read-only — approval actions live
 * on the app detail page.
 */
export function PhaseChecksGrid({ phases }: { phases: Phase[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {phases.map((phase) => (
        <PhaseColumn key={phase.key} phase={phase} />
      ))}
    </div>
  )
}

function PhaseColumn({ phase }: { phase: Phase }) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.2em]",
          phase.state === "completed" && "text-[color:var(--color-success)]",
          phase.state === "active" && "text-[color:var(--color-warning)]",
          phase.state === "pending" && "text-[color:var(--color-fg-subtle)]"
        )}
      >
        {phase.label}
      </div>
      <ul className="space-y-1.5">
        {phase.checks.map((c) => (
          <li key={c.id}>
            <CheckItem check={c} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CheckItem({ check }: { check: Check }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <StateIcon state={check.state} />
      <span className={cn("truncate", CHECK_LABEL_CLASS[check.state])}>
        {check.title ?? check.label}
      </span>
    </div>
  )
}

function StateIcon({ state }: { state: CheckState }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
        ICON_CLASSES[state]
      )}
      aria-label={state}
    >
      {state === "done" || state === "approved" ? (
        <CheckIcon className="size-2.5" strokeWidth={3} />
      ) : state === "rejected" || state === "vetoed" ? (
        <X className="size-2.5" strokeWidth={3} />
      ) : state === "pending" ? (
        <span className="block h-1 w-1 rounded-full bg-current" aria-hidden />
      ) : (
        <Minus className="size-2.5" />
      )}
    </span>
  )
}

const ICON_CLASSES: Record<CheckState, string> = {
  done: "border-[color:var(--color-success)] bg-[color:var(--color-success)] text-white",
  approved:
    "border-[color:var(--color-success)] bg-[color:var(--color-success)] text-white",
  pending:
    "border-[color:var(--color-warning)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  rejected:
    "border-[color:var(--color-danger)] bg-[color:var(--color-danger)] text-white",
  vetoed:
    "border-[color:var(--color-danger)] bg-[color:var(--color-danger)] text-white",
  not_started:
    "border-[color:var(--color-border-strong)] bg-[color:var(--color-bg)] text-[color:var(--color-fg-subtle)]",
}

const CHECK_LABEL_CLASS: Record<CheckState, string> = {
  done: "text-[color:var(--color-fg)]",
  approved: "text-[color:var(--color-fg)]",
  pending: "text-[color:var(--color-fg)]",
  rejected: "text-[color:var(--color-danger)]",
  vetoed: "text-[color:var(--color-danger)]",
  not_started: "text-[color:var(--color-fg-subtle)]",
}
