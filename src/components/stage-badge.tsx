import type { AppStage } from "@/lib/db-types"
import { STAGE_BADGE_CLASSES, STAGE_LABELS } from "@/lib/stages"
import { cn } from "@/lib/utils"

export function StageBadge({
  stage,
  className,
}: {
  stage: AppStage
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        STAGE_BADGE_CLASSES[stage],
        className
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  )
}
