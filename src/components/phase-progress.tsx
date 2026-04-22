import type { AppProgress, Phase } from "@/lib/progress"
import { cn } from "@/lib/utils"

/**
 * The horizontal bar under each app row. 4 segments, one per phase.
 *
 *  - completed → solid green
 *  - active    → solid orange (fase actual)
 *  - blocked   → solid red (solo cuando la severity del app es "blocked",
 *                 lo que hoy equivale a "Ready for Mainnet con el timer
 *                 de 48h expirado")
 *  - pending   → light grey
 */
export function PhaseProgress({
  progress,
}: {
  progress: AppProgress
}) {
  return (
    <div className="flex w-full gap-1">
      {progress.phases.map((phase) => (
        <Segment
          key={phase.key}
          phase={phase}
          severity={progress.severity}
        />
      ))}
    </div>
  )
}

function Segment({
  phase,
  severity,
}: {
  phase: Phase
  severity: AppProgress["severity"]
}) {
  const isBlocked = phase.state === "active" && severity === "blocked"

  return (
    <div
      className={cn(
        "h-2 flex-1 rounded-[2px] transition",
        phase.state === "completed" && "bg-[color:var(--color-success)]",
        phase.state === "active" && !isBlocked &&
          "bg-[color:var(--color-warning)]",
        isBlocked && "bg-[color:var(--color-danger)]",
        phase.state === "pending" && "bg-[color:var(--color-bg-subtle)]"
      )}
      aria-label={`${phase.label}: ${phase.state}`}
    />
  )
}
