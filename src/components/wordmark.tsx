import { cn } from "@/lib/utils"

/**
 * Taiko Launchpad wordmark. The drum mark is rendered as a CSS mask so we
 * can tint it with the Taiko pink regardless of the source SVG's fill.
 */
const MARK_SIZES = {
  sm: 22,
  md: 34,
  lg: 52,
}

const TEXT_SIZES = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-5xl sm:text-6xl",
}

export function Wordmark({
  size = "md",
  showDescriptor = true,
  className,
}: {
  size?: "sm" | "md" | "lg"
  showDescriptor?: boolean
  className?: string
}) {
  const markSize = MARK_SIZES[size]

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2.5">
        <span
          aria-label="Taiko"
          role="img"
          className="shrink-0 bg-[color:var(--color-accent)]"
          style={{
            width: markSize,
            height: markSize,
            maskImage: "url(/brand/taiko-mark.svg)",
            WebkitMaskImage: "url(/brand/taiko-mark.svg)",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
        <span
          className={cn(
            "font-serif leading-none tracking-tight text-[color:var(--color-fg)]",
            TEXT_SIZES[size]
          )}
        >
          Taiko{" "}
          <span className="italic text-[color:var(--color-accent)]">
            Launchpad
          </span>
        </span>
      </div>

      {showDescriptor && size !== "sm" && (
        <div
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]"
          style={{ paddingLeft: `${markSize + 10}px` }}
        >
          <span className="h-px w-4 bg-[color:var(--color-border-strong)]" />
          <span>Internal Operations</span>
        </div>
      )}
    </div>
  )
}
