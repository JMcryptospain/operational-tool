"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { SeverityDot } from "@/components/severity-dot"
import { TimelineRow } from "@/components/timeline-row"
import type { BlockerSeverity } from "@/lib/pipeline"
import type { AppProgress } from "@/lib/progress"
import { cn } from "@/lib/utils"

export type PipelineRow = {
  id: string
  name: string
  progress: AppProgress
}

export function PipelineTable({ rows }: { rows: PipelineRow[] }) {
  const [sev, setSev] = useState<"all" | BlockerSeverity>("all")
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    let out = rows
    if (sev !== "all") out = out.filter((r) => r.progress.severity === sev)
    if (q.trim())
      out = out.filter((r) =>
        r.name.toLowerCase().includes(q.trim().toLowerCase())
      )
    return out
  }, [rows, sev, q])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
            Severity
          </label>
          <select
            value={sev}
            onChange={(e) => setSev(e.target.value as typeof sev)}
            className="border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-2 py-1 text-xs text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
          >
            <option value="all">All</option>
            <option value="blocked">Blocked</option>
            <option value="warning">Warning</option>
            <option value="watching">Watching</option>
            <option value="idle">Idle</option>
          </select>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search apps…"
          className="min-w-48 border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-2 py-1 text-xs text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
        />
        <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </div>
      </div>

      <div className="overflow-x-auto border border-[color:var(--color-border)]">
        <div className="min-w-[1100px]">
          {/* Header */}
          <div className="grid grid-cols-[280px_1fr] border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]">
            <div className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)]">
              App
            </div>
            <div className="grid grid-cols-[1fr_1.2fr_1fr_1.3fr] border-l border-[color:var(--color-border)]">
              <HeaderLabel>MVP</HeaderLabel>
              <HeaderLabel>Ready for Mainnet</HeaderLabel>
              <HeaderLabel>Launched</HeaderLabel>
              <HeaderLabel>MKT Basic</HeaderLabel>
            </div>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="px-4 py-16 text-center text-sm text-[color:var(--color-fg-muted)]">
              No apps match the current filter.
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--color-border)]">
              {filtered.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/apps/${row.id}`}
                    className={cn(
                      "grid grid-cols-[280px_1fr] items-stretch transition hover:bg-[color:var(--color-bg-elevated)]",
                      row.progress.severity === "blocked" &&
                        "bg-[color:var(--color-danger-soft)]/30"
                    )}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <SeverityDot severity={row.progress.severity} />
                      <div className="min-w-0">
                        <div className="truncate font-serif text-base leading-tight text-[color:var(--color-fg)]">
                          {row.name}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
                          {row.progress.daysInStage}d in stage
                        </div>
                      </div>
                    </div>
                    <div className="border-l border-[color:var(--color-border)]">
                      <TimelineRow phases={row.progress.phases} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l border-[color:var(--color-border)] px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-fg-subtle)] first:border-l-0">
      {children}
    </div>
  )
}
