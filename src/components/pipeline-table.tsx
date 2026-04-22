"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRight, ArrowUpRight } from "lucide-react"

import { PhaseChecksGrid } from "@/components/phase-checks-grid"
import { PhaseProgress } from "@/components/phase-progress"
import { SeverityDot } from "@/components/severity-dot"
import type { BlockerSeverity } from "@/lib/pipeline"
import type { AppProgress } from "@/lib/progress"
import { cn } from "@/lib/utils"

export type PipelineRow = {
  id: string
  name: string
  pm_name: string
  days_in_stage: number
  progress: AppProgress
}

const COLUMN_WIDTHS = "18rem minmax(0, 1fr) 9rem 5rem 3rem"

export function PipelineTable({ rows }: { rows: PipelineRow[] }) {
  const [sev, setSev] = useState<"all" | BlockerSeverity>("all")
  const [q, setQ] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search apps…"
          className="min-w-56 border border-[color:var(--color-border)] bg-white px-3 py-1.5 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none"
          type="search"
          autoComplete="off"
        />
        <div className="flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
            Severity
          </label>
          <select
            value={sev}
            onChange={(e) => setSev(e.target.value as typeof sev)}
            className="border border-[color:var(--color-border)] bg-white px-2 py-1.5 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
          >
            <option value="all">All</option>
            <option value="blocked">Blocked</option>
            <option value="warning">Warning</option>
            <option value="watching">Watching</option>
            <option value="idle">Idle</option>
          </select>
        </div>
        <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          {filtered.length} {filtered.length === 1 ? "app" : "apps"}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[4px] border border-[color:var(--color-border)] bg-white">
        {/* Header */}
        <div
          className="grid items-center gap-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]"
          style={{ gridTemplateColumns: COLUMN_WIDTHS }}
        >
          <div>App</div>
          <div className="grid grid-cols-5 gap-1">
            <span>MVP</span>
            <span>Refining & Legal</span>
            <span>Ready for Mainnet</span>
            <span>Launched</span>
            <span>MKT Basic</span>
          </div>
          <div>Owner</div>
          <div className="text-right">Days</div>
          <div aria-hidden />
        </div>

        {/* Body */}
        {filtered.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-[color:var(--color-fg-muted)]">
            No apps match the current filter.
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {filtered.map((row) => (
              <RowItem
                key={row.id}
                row={row}
                expanded={expanded.has(row.id)}
                onToggle={() => toggle(row.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function RowItem({
  row,
  expanded,
  onToggle,
}: {
  row: PipelineRow
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <li
      className={cn(
        "group transition",
        row.progress.severity === "blocked" && "bg-[color:var(--color-danger-soft)]/40"
      )}
    >
      <div
        className="relative grid items-center gap-4 px-4 py-3 hover:bg-[color:var(--color-bg-subtle)]"
        style={{ gridTemplateColumns: COLUMN_WIDTHS }}
      >
        {/* 1 · Name + severity */}
        <Link
          href={`/apps/${row.id}`}
          className="flex min-w-0 items-center gap-3"
        >
          <SeverityDot severity={row.progress.severity} />
          <span className="truncate font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)]">
            {row.name}
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 text-[color:var(--color-fg-subtle)] opacity-0 transition group-hover:opacity-100" />
        </Link>

        {/* 2 · Progress bar spanning the four phase columns */}
        <div>
          <PhaseProgress progress={row.progress} />
          <div className="mt-1 grid grid-cols-5 gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
            {row.progress.phases.map((p) => (
              <span
                key={p.key}
                className={cn(
                  "truncate",
                  p.state === "active" &&
                    row.progress.severity === "blocked" &&
                    "text-[color:var(--color-danger)]",
                  p.state === "active" &&
                    row.progress.severity !== "blocked" &&
                    "text-[color:var(--color-warning)]",
                  p.state === "completed" &&
                    "text-[color:var(--color-success)]"
                )}
              >
                {stateGlyph(p.state)} {countChecks(p)}
              </span>
            ))}
          </div>
        </div>

        {/* 3 · Owner */}
        <div className="truncate text-sm text-[color:var(--color-fg-muted)]">
          {row.pm_name || "—"}
        </div>

        {/* 4 · Days in stage */}
        <div
          className={cn(
            "text-right font-mono text-sm tabular-nums",
            row.progress.severity === "blocked"
              ? "text-[color:var(--color-danger)]"
              : "text-[color:var(--color-fg-muted)]"
          )}
        >
          {row.days_in_stage}d
        </div>

        {/* 5 · Expand toggle */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Collapse details" : "Expand details"}
          aria-expanded={expanded}
          className="inline-flex size-8 items-center justify-center rounded text-[color:var(--color-fg-muted)] transition hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
        >
          <ChevronRight
            className={cn(
              "size-4 transition",
              expanded && "rotate-90"
            )}
          />
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-4 py-4">
          <PhaseChecksGrid phases={row.progress.phases} />
        </div>
      )}
    </li>
  )
}

function stateGlyph(state: string): string {
  if (state === "completed") return "✓"
  if (state === "active") return "●"
  return "○"
}

function countChecks(phase: AppProgress["phases"][number]): string {
  const done = phase.checks.filter(
    (c) => c.state === "done" || c.state === "approved"
  ).length
  return `${done}/${phase.checks.length}`
}
