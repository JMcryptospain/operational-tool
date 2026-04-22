import type { BlockerSeverity } from "@/lib/pipeline"
import { cn } from "@/lib/utils"

const COLORS: Record<BlockerSeverity, string> = {
  idle: "bg-[color:var(--color-fg-subtle)]",
  watching: "bg-[color:var(--color-info)]",
  warning: "bg-[color:var(--color-warning)]",
  blocked: "bg-[color:var(--color-danger)]",
}

const PULSE: Record<BlockerSeverity, boolean> = {
  idle: false,
  watching: false,
  warning: false,
  blocked: true,
}

/**
 * A small status dot. Use on lists / kanban cards where colour alone carries
 * the meaning; always pair with a text label elsewhere in the row for a11y.
 */
export function SeverityDot({
  severity,
  className,
}: {
  severity: BlockerSeverity
  className?: string
}) {
  return (
    <span
      aria-label={severity}
      className={cn(
        "relative inline-flex h-2 w-2 shrink-0 rounded-full",
        COLORS[severity],
        className
      )}
    >
      {PULSE[severity] && (
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-danger)] opacity-50"
        />
      )}
    </span>
  )
}
