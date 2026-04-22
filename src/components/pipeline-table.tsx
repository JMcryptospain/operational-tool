"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowUpRight, Code2, ChevronDown, ChevronUp } from "lucide-react"

import { SeverityDot } from "@/components/severity-dot"
import type { AppStage, MonetizationModel } from "@/lib/db-types"
import type { AppStatus, BlockerSeverity } from "@/lib/pipeline"
import { compareSeverity, PIPELINE_STAGES, TERMINAL_STAGES } from "@/lib/pipeline"
import { MONETIZATION_LABELS, STAGE_LABELS } from "@/lib/stages"
import { cn } from "@/lib/utils"

export type PipelineRow = {
  id: string
  name: string
  current_stage: AppStage
  stage_entered_at: string
  live_url: string | null
  repo_url: string
  monetization_model: MonetizationModel | null
  pm_name: string
  pm_email: string
  status: AppStatus
}

type SortKey = "app" | "stage" | "owner" | "days" | "severity"
type SortDir = "asc" | "desc"

const STAGE_ORDER = [...PIPELINE_STAGES, ...TERMINAL_STAGES]

export function PipelineTable({ rows }: { rows: PipelineRow[] }) {
  const [stage, setStage] = useState<"all" | "pipeline" | "terminal" | AppStage>(
    "pipeline"
  )
  const [severity, setSeverity] = useState<"all" | BlockerSeverity>("all")
  const [owner, setOwner] = useState<"all" | string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("severity")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const owners = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.pm_name) s.add(r.pm_name)
    return [...s].sort()
  }, [rows])

  const filtered = useMemo(() => {
    let out = rows.slice()
    if (stage === "pipeline") {
      out = out.filter((r) => PIPELINE_STAGES.includes(r.current_stage))
    } else if (stage === "terminal") {
      out = out.filter((r) => TERMINAL_STAGES.includes(r.current_stage))
    } else if (stage !== "all") {
      out = out.filter((r) => r.current_stage === stage)
    }
    if (severity !== "all") {
      out = out.filter((r) => r.status.severity === severity)
    }
    if (owner !== "all") {
      out = out.filter((r) => r.pm_name === owner)
    }
    out.sort((a, b) => compareRows(a, b, sortKey, sortDir))
    return out
  }, [rows, stage, severity, owner, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir(key === "severity" ? "asc" : "asc")
    }
  }

  return (
    <div className="space-y-3">
      <Filters
        stage={stage}
        setStage={setStage}
        severity={severity}
        setSeverity={setSeverity}
        owner={owner}
        setOwner={setOwner}
        owners={owners}
        total={filtered.length}
      />

      <div className="overflow-x-auto border border-[color:var(--color-border)]">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] text-left font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              <Th
                className="w-6 pl-3"
                onClick={() => handleSort("severity")}
                active={sortKey === "severity"}
                dir={sortDir}
              >
                ●
              </Th>
              <Th
                onClick={() => handleSort("app")}
                active={sortKey === "app"}
                dir={sortDir}
              >
                App
              </Th>
              <Th
                onClick={() => handleSort("stage")}
                active={sortKey === "stage"}
                dir={sortDir}
              >
                Stage
              </Th>
              <Th
                onClick={() => handleSort("owner")}
                active={sortKey === "owner"}
                dir={sortDir}
              >
                Owner
              </Th>
              <Th
                onClick={() => handleSort("days")}
                active={sortKey === "days"}
                dir={sortDir}
                className="text-right"
              >
                Days
              </Th>
              <th className="px-3 py-2 font-normal">Waiting on</th>
              <th className="px-3 py-2 font-normal">Monetization</th>
              <th className="px-3 py-2 pr-3 text-right font-normal">Links</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-10 text-center text-sm text-[color:var(--color-fg-muted)]"
                >
                  No apps match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => <Row key={r.id} row={r} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* --- subcomponents --- */

function Th({
  children,
  onClick,
  active,
  dir,
  className,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  dir: SortDir
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn("px-3 py-2 font-normal", className)}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition hover:text-[color:var(--color-fg)]",
          active && "text-[color:var(--color-fg)]"
        )}
      >
        <span>{children}</span>
        {active &&
          (dir === "asc" ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          ))}
      </button>
    </th>
  )
}

function Row({ row }: { row: PipelineRow }) {
  const { status } = row
  const sevTextClass =
    status.severity === "blocked"
      ? "text-[color:var(--color-danger)]"
      : status.severity === "warning"
        ? "text-[color:var(--color-warning)]"
        : status.severity === "watching"
          ? "text-[color:var(--color-info)]"
          : "text-[color:var(--color-fg-subtle)]"

  return (
    <tr className="group border-b border-[color:var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-bg-elevated)]">
      <td className="pl-3">
        <SeverityDot severity={status.severity} />
      </td>
      <td className="px-3 py-2.5">
        <Link
          href={`/apps/${row.id}`}
          className="block min-w-0 text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
        >
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{row.name}</span>
            <ArrowUpRight className="size-3 opacity-0 transition group-hover:opacity-100" />
          </div>
          <div className={cn("mt-0.5 truncate text-xs", sevTextClass)}>
            {status.reason}
          </div>
        </Link>
      </td>
      <td className="px-3 py-2.5">
        <StageChip stage={row.current_stage} />
      </td>
      <td className="px-3 py-2.5 text-[color:var(--color-fg-muted)]">
        {row.pm_name || row.pm_email || "—"}
      </td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[color:var(--color-fg-muted)]">
        {status.daysInStage}
      </td>
      <td className="px-3 py-2.5">
        {status.blockers.length === 0 ? (
          <span className="text-[color:var(--color-fg-subtle)]">—</span>
        ) : (
          <span className="text-[color:var(--color-fg)]">
            {status.blockers.join(", ")}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-[color:var(--color-fg-muted)]">
        {row.monetization_model
          ? MONETIZATION_LABELS[row.monetization_model]
          : "—"}
      </td>
      <td className="px-3 py-2.5 pr-3 text-right">
        <div className="inline-flex items-center gap-2.5 text-[color:var(--color-fg-subtle)]">
          <a
            href={row.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open repository"
            onClick={(e) => e.stopPropagation()}
            className="hover:text-[color:var(--color-accent)]"
          >
            <Code2 className="size-3.5" />
          </a>
          {row.live_url && (
            <a
              href={row.live_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open live URL"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-[color:var(--color-accent)]"
            >
              <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </td>
    </tr>
  )
}

function StageChip({ stage }: { stage: AppStage }) {
  return (
    <span className="inline-flex items-center border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-fg-muted)]">
      {STAGE_LABELS[stage]}
    </span>
  )
}

type StageFilter = "all" | "pipeline" | "terminal" | AppStage
type SeverityFilter = "all" | BlockerSeverity

function Filters({
  stage,
  setStage,
  severity,
  setSeverity,
  owner,
  setOwner,
  owners,
  total,
}: {
  stage: StageFilter
  setStage: (v: StageFilter) => void
  severity: SeverityFilter
  setSeverity: (v: SeverityFilter) => void
  owner: string
  setOwner: (v: string) => void
  owners: string[]
  total: number
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <FilterBox label="Stage">
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as StageFilter)}
          className={selectClass}
        >
          <option value="pipeline">In Pipeline</option>
          <option value="all">All stages</option>
          <option value="terminal">Terminal</option>
          <option disabled>──────────</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
          <option disabled>──────────</option>
          {TERMINAL_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </FilterBox>

      <FilterBox label="Severity">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
          className={selectClass}
        >
          <option value="all">All</option>
          <option value="blocked">Blocked</option>
          <option value="warning">Warning</option>
          <option value="watching">Watching</option>
          <option value="idle">Idle</option>
        </select>
      </FilterBox>

      <FilterBox label="Owner">
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className={selectClass}
        >
          <option value="all">All</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </FilterBox>

      <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
        {total} {total === 1 ? "result" : "results"}
      </div>
    </div>
  )
}

const selectClass =
  "block min-w-[10rem] border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-2 py-1.5 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"

function FilterBox({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-fg-subtle)]">
        {label}
      </span>
      {children}
    </div>
  )
}

/* --- sort helpers --- */

function compareRows(
  a: PipelineRow,
  b: PipelineRow,
  key: SortKey,
  dir: SortDir
): number {
  const mult = dir === "asc" ? 1 : -1
  switch (key) {
    case "app":
      return a.name.localeCompare(b.name) * mult
    case "owner":
      return (a.pm_name || a.pm_email).localeCompare(
        b.pm_name || b.pm_email
      ) * mult
    case "days":
      return (a.status.daysInStage - b.status.daysInStage) * mult
    case "stage":
      return (
        (STAGE_ORDER.indexOf(a.current_stage) -
          STAGE_ORDER.indexOf(b.current_stage)) *
        mult
      )
    case "severity":
      return compareSeverity(a.status.severity, b.status.severity) * mult
  }
}
