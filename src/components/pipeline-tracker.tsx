import type { AppStage } from "@/lib/db-types"
import { cn } from "@/lib/utils"

/**
 * Horizontal pipeline tracker — a chain of stage dots with the current one
 * emphasized. Gives the detail page a strong sense of "where we are" at a
 * glance.
 *
 * Terminal stages (active/maintain/killed) are rendered as a final
 * "outcome" slot to avoid drawing 9 segments.
 */
const PIPELINE: AppStage[] = [
  "mvp",
  "ready_for_mainnet",
  "monetization_setup",
  "launched",
  "review",
]

const LABELS: Record<AppStage, string> = {
  mvp: "MVP",
  ready_for_mainnet: "Ready",
  monetization_setup: "Pay",
  launched: "Launch",
  review: "Review",
  active: "Active",
  maintain_only: "Maintain",
  killed: "Killed",
}

export function PipelineTracker({ current }: { current: AppStage }) {
  const isTerminal =
    current === "active" ||
    current === "maintain_only" ||
    current === "killed"

  const currentIndex = isTerminal
    ? PIPELINE.length
    : PIPELINE.indexOf(current)

  return (
    <div className="flex w-full items-start gap-1 overflow-x-auto">
      {PIPELINE.map((stage, i) => {
        const isPast = i < currentIndex
        const isCurrent = !isTerminal && i === currentIndex
        return (
          <div
            key={stage}
            className="flex min-w-[4.5rem] flex-1 flex-col gap-2"
          >
            <div
              className={cn(
                "h-0.5 w-full",
                isCurrent || isPast
                  ? "bg-[color:var(--color-accent)]"
                  : "bg-[color:var(--color-border)]"
              )}
            />
            <div className="space-y-0.5 px-0.5">
              <div
                className={cn(
                  "font-mono text-[9px] uppercase tracking-[0.2em]",
                  isCurrent
                    ? "text-[color:var(--color-accent)]"
                    : isPast
                      ? "text-[color:var(--color-fg-muted)]"
                      : "text-[color:var(--color-fg-subtle)]"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                className={cn(
                  "text-xs font-medium",
                  isCurrent
                    ? "text-[color:var(--color-fg)]"
                    : isPast
                      ? "text-[color:var(--color-fg-muted)]"
                      : "text-[color:var(--color-fg-subtle)]"
                )}
              >
                {LABELS[stage]}
              </div>
            </div>
          </div>
        )
      })}

      {/* Terminal outcome slot */}
      <div className="flex min-w-[5rem] flex-1 flex-col gap-2">
        <div
          className={cn(
            "h-0.5 w-full",
            isTerminal
              ? current === "killed"
                ? "bg-[color:var(--color-danger)]"
                : "bg-[color:var(--color-success)]"
              : "bg-[color:var(--color-border)]"
          )}
        />
        <div className="space-y-0.5 px-0.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
            OUT
          </div>
          <div
            className={cn(
              "text-xs font-medium",
              isTerminal
                ? current === "killed"
                  ? "text-[color:var(--color-danger)]"
                  : "text-[color:var(--color-fg)]"
                : "text-[color:var(--color-fg-subtle)]"
            )}
          >
            {isTerminal ? LABELS[current] : "Outcome"}
          </div>
        </div>
      </div>
    </div>
  )
}
