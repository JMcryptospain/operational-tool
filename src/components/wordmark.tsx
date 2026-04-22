import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Taiko Launchpad wordmark. Pairs the official Taiko drum mark with the
 * product name. The "Launchpad" descriptor is set in italic serif and
 * colored with the brand pink so it never shouts over the mark itself.
 */
const MARK_SIZES = {
  sm: 24,
  md: 36,
  lg: 56,
}

const TEXT_SIZES = {
  sm: "text-lg",
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
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-3">
        <Image
          src="/brand/taiko-mark.svg"
          alt="Taiko"
          width={markSize}
          height={markSize}
          style={{ width: markSize, height: "auto" }}
          className="shrink-0"
          priority
        />
        <h1
          className={cn(
            "font-serif leading-none tracking-tight text-[color:var(--color-fg)]",
            TEXT_SIZES[size]
          )}
        >
          Taiko{" "}
          <span className="italic text-[color:var(--color-accent)]">
            Launchpad
          </span>
        </h1>
      </div>

      {showDescriptor && size !== "sm" && (
        <div
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]"
          style={{ paddingLeft: `${markSize + 12}px` }}
        >
          <span className="h-px w-4 bg-[color:var(--color-border-strong)]" />
          <span>Internal Operations</span>
        </div>
      )}
    </div>
  )
}
