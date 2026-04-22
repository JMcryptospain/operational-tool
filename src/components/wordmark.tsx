import { cn } from "@/lib/utils"

/**
 * Taiko Launchpad wordmark. Display serif (italic "Launchpad") paired with
 * a small mono metadata line. Used in login, top nav, and empty states.
 */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const sizes = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl sm:text-6xl",
  }
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <h1
        className={cn(
          "font-serif leading-none tracking-tight text-[color:var(--color-fg)]",
          sizes[size]
        )}
      >
        Taiko <span className="italic text-[color:var(--color-accent)]">Launchpad</span>
      </h1>
      {size !== "sm" && (
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
          <span className="h-px w-4 bg-[color:var(--color-border-strong)]" />
          <span>Internal Operations</span>
        </div>
      )}
    </div>
  )
}
