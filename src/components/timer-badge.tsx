import { Clock3, AlertTriangle } from "lucide-react"
import type { Timer } from "@/lib/pipeline"
import { cn } from "@/lib/utils"

/**
 * Renders a countdown-style badge for the app's active timer.
 *
 * Compact (tabular): "Build · 6/10d" in a pill. Colour driven by severity.
 * Full    (detail):  Label + bar + "Xd left" / "Expired Xh ago".
 */
export function TimerBadge({
  timer,
  variant = "compact",
  className,
}: {
  timer: Timer
  variant?: "compact" | "full"
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, (timer.elapsed / timer.budget) * 100))
  const overdue = timer.remaining < 0

  const wrapTone =
    timer.severity === "blocked"
      ? "text-[color:var(--color-danger)] bg-[color:var(--color-danger-soft)] border-[color:var(--color-danger)]/30"
      : timer.severity === "warning"
        ? "text-[color:var(--color-warning)] bg-[color:var(--color-warning-soft)] border-[color:var(--color-warning)]/30"
        : "text-[color:var(--color-fg-muted)] bg-[color:var(--color-bg-subtle)] border-[color:var(--color-border)]"

  const barTone =
    timer.severity === "blocked"
      ? "bg-[color:var(--color-danger)]"
      : timer.severity === "warning"
        ? "bg-[color:var(--color-warning)]"
        : "bg-[color:var(--color-success)]"

  if (variant === "compact") {
    const unit = timer.unit === "days" ? "d" : "h"
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
          wrapTone,
          className
        )}
        title={`${timer.label}: ${timer.elapsed}/${timer.budget}${unit}`}
      >
        {overdue ? (
          <AlertTriangle className="size-3" />
        ) : (
          <Clock3 className="size-3" />
        )}
        <span>
          {timer.kind === "build" ? "Build" : "Review"}
          {" · "}
          <span className="tabular-nums">
            {timer.elapsed}/{timer.budget}
            {unit}
          </span>
        </span>
      </span>
    )
  }

  // Full variant
  const unit = timer.unit === "days" ? "day" : "hour"
  const plural = timer.unit === "days" ? "days" : "hours"
  const remainingText = overdue
    ? `Overdue by ${Math.abs(timer.remaining)} ${Math.abs(timer.remaining) === 1 ? unit : plural}`
    : `${timer.remaining} ${timer.remaining === 1 ? unit : plural} left`

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        wrapTone,
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {overdue ? (
            <AlertTriangle className="size-4" />
          ) : (
            <Clock3 className="size-4" />
          )}
          <span className="font-semibold">
            {timer.label}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
            {timer.kind === "build"
              ? "MVP → Ready for Mainnet · 10 days"
              : "48h business hours for Gustavo + Joaquín"}
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {remainingText}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
        <div
          className={cn("h-full transition-all", barTone)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] opacity-80">
        <span className="tabular-nums">
          {timer.elapsed}/{timer.budget}{" "}
          {timer.unit === "days" ? "days elapsed" : "hours elapsed"}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
    </div>
  )
}
