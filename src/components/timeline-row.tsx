import { Check as CheckIcon, Minus, X } from "lucide-react"
import type { Check, CheckState, Phase, PhaseState } from "@/lib/progress"
import { cn } from "@/lib/utils"

/**
 * Renders a single app as a horizontal timeline row. Left: name + severity
 * dot. Right: a sequence of phase "cells", each with its own mini set of
 * checks. The whole row is a link to the app detail page.
 */

export function TimelineRow({
  phases,
}: {
  phases: Phase[]
}) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr_1fr_1.3fr] items-stretch">
      {phases.map((phase, i) => (
        <PhaseCell key={phase.key} phase={phase} isFirst={i === 0} isLast={i === phases.length - 1} />
      ))}
    </div>
  )
}

function PhaseCell({
  phase,
  isFirst,
  isLast,
}: {
  phase: Phase
  isFirst: boolean
  isLast: boolean
}) {
  const rail = RAIL[phase.state]
  return (
    <div className="relative flex flex-col gap-2 px-3 py-3">
      {/* The horizontal timeline rail — drawn behind the cell label */}
      <div
        aria-hidden
        className="absolute left-0 right-0 top-[26px] h-[2px]"
        style={{
          background: `var(${rail})`,
          marginLeft: isFirst ? "12px" : 0,
          marginRight: isLast ? "12px" : 0,
        }}
      />
      {/* Node dot at the start of the rail */}
      <div
        aria-hidden
        className={cn(
          "absolute left-2 top-[22px] h-2.5 w-2.5 rounded-full border-2",
          NODE[phase.state]
        )}
      />

      <div className="relative z-10 pl-6">
        <div
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.18em]",
            phase.state === "completed" && "text-[color:var(--color-success)]",
            phase.state === "active" && "text-[color:var(--color-accent)]",
            phase.state === "pending" && "text-[color:var(--color-fg-subtle)]"
          )}
        >
          {phase.label}
        </div>
      </div>

      {/* Sub-checks */}
      {phase.checks.length > 0 && (
        <ul className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs">
          {phase.checks.map((c) => (
            <li key={c.id}>
              <CheckPill check={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const RAIL: Record<PhaseState, string> = {
  completed: "--color-success",
  active: "--color-accent",
  pending: "--color-border",
}

const NODE: Record<PhaseState, string> = {
  completed:
    "bg-[color:var(--color-success)] border-[color:var(--color-success)]",
  active:
    "bg-[color:var(--color-accent)] border-[color:var(--color-accent)]",
  pending: "bg-[color:var(--color-bg)] border-[color:var(--color-border-strong)]",
}

function CheckPill({ check }: { check: Check }) {
  const [icon, classes] = ICONS[check.state]
  return (
    <span
      title={check.title ?? check.label}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px]",
        classes
      )}
    >
      <span
        className={cn(
          "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border",
          PILL_BG[check.state]
        )}
      >
        {icon}
      </span>
      <span>{check.label}</span>
    </span>
  )
}

const ICONS: Record<CheckState, [React.ReactNode, string]> = {
  done: [
    <CheckIcon key="i" className="size-2.5" strokeWidth={3} />,
    "text-[color:var(--color-success)]",
  ],
  approved: [
    <CheckIcon key="i" className="size-2.5" strokeWidth={3} />,
    "text-[color:var(--color-success)]",
  ],
  pending: [
    <span
      key="i"
      className="block h-1 w-1 rounded-full bg-current"
      aria-hidden
    />,
    "text-[color:var(--color-warning)]",
  ],
  rejected: [
    <X key="i" className="size-2.5" strokeWidth={3} />,
    "text-[color:var(--color-danger)]",
  ],
  vetoed: [
    <X key="i" className="size-2.5" strokeWidth={3} />,
    "text-[color:var(--color-danger)]",
  ],
  not_started: [
    <Minus key="i" className="size-2.5" />,
    "text-[color:var(--color-fg-subtle)]",
  ],
}

const PILL_BG: Record<CheckState, string> = {
  done: "border-[color:var(--color-success)]/40 bg-[color:var(--color-success-soft)]",
  approved:
    "border-[color:var(--color-success)]/40 bg-[color:var(--color-success-soft)]",
  pending:
    "border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning-soft)]",
  rejected:
    "border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger-soft)]",
  vetoed:
    "border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger-soft)]",
  not_started:
    "border-[color:var(--color-border)] bg-transparent",
}
