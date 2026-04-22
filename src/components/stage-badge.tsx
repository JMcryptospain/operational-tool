import type { AppStage } from "@/lib/db-types"
import { STAGE_LABELS } from "@/lib/stages"
import { cn } from "@/lib/utils"

/**
 * Editorial stage badge. A 2-letter code + dot + label, monospace.
 * Think stock ticker or an engineering-log entry.
 */
const STAGE_CODES: Record<AppStage, string> = {
  mvp: "MV",
  ready_for_mainnet: "RM",
  monetization_setup: "MN",
  launched: "LN",
  review: "RV",
  active: "AC",
  maintain_only: "MO",
  killed: "KL",
}

const STAGE_COLORS: Record<AppStage, string> = {
  mvp: "text-[color:var(--color-info)]",
  ready_for_mainnet: "text-[color:var(--color-warning)]",
  monetization_setup: "text-[color:var(--color-accent)]",
  launched: "text-[color:var(--color-success)]",
  review: "text-[color:var(--color-warning)]",
  active: "text-[color:var(--color-success)]",
  maintain_only: "text-[color:var(--color-fg-muted)]",
  killed: "text-[color:var(--color-danger)]",
}

export function StageBadge({
  stage,
  variant = "default",
  className,
}: {
  stage: AppStage
  variant?: "default" | "prominent"
  className?: string
}) {
  const label = STAGE_LABELS[stage]
  const code = STAGE_CODES[stage]
  const color = STAGE_COLORS[stage]

  if (variant === "prominent") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 border-y border-[color:var(--color-border)] py-2 pr-4 font-mono text-xs uppercase tracking-[0.15em]",
          className
        )}
      >
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-bold",
            color
          )}
        >
          {code}
        </span>
        <span className="h-1 w-1 rounded-full bg-current opacity-50" />
        <span className={color}>{label}</span>
      </div>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em]",
        color,
        className
      )}
    >
      <span className="font-bold">{code}</span>
      <span className="h-0.5 w-0.5 rounded-full bg-current opacity-70" />
      <span>{label}</span>
    </span>
  )
}
