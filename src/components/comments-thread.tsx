"use client"

import { useState, useTransition } from "react"
import { CornerDownRight, MessageSquare, Trash2, Loader2 } from "lucide-react"
import {
  postComment,
  deleteComment,
} from "@/app/apps/[id]/comment-actions"
import { cn } from "@/lib/utils"

export type CommentNode = {
  id: string
  body: string
  created_at: string
  parent_comment_id: string | null
  author: {
    id: string
    full_name: string | null
    email: string
    role: string
  } | null
  children: CommentNode[]
}

export function CommentsThread({
  appId,
  comments,
  currentUserId,
}: {
  appId: string
  comments: CommentNode[]
  currentUserId: string
}) {
  return (
    <section className="rounded-lg border border-[color:var(--color-border)] bg-white p-5">
      <header className="mb-4 flex items-center gap-2">
        <MessageSquare className="size-4 text-[color:var(--color-fg-muted)]" />
        <h2 className="text-lg font-semibold text-[color:var(--color-fg)]">
          Feedback & discussion
        </h2>
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          {flatCount(comments)} {flatCount(comments) === 1 ? "message" : "messages"}
        </span>
      </header>

      <CommentForm appId={appId} />

      {comments.length === 0 ? (
        <p className="mt-5 border-t border-[color:var(--color-border)] pt-5 text-sm text-[color:var(--color-fg-muted)]">
          No feedback yet. Be the first to chime in.
        </p>
      ) : (
        <ul className="mt-6 space-y-5 border-t border-[color:var(--color-border)] pt-5">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentItem
                appId={appId}
                comment={c}
                currentUserId={currentUserId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CommentItem({
  appId,
  comment,
  currentUserId,
  depth = 0,
}: {
  appId: string
  comment: CommentNode
  currentUserId: string
  depth?: number
}) {
  const [replying, setReplying] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isOwn = comment.author?.id === currentUserId
  const name = comment.author?.full_name ?? comment.author?.email ?? "Someone"
  const role = comment.author?.role
    ? comment.author.role.replace("_", " ")
    : ""
  const timeAgo = relativeTime(comment.created_at)

  const handleDelete = () => {
    if (!confirm("Delete this comment?")) return
    startTransition(async () => {
      const r = await deleteComment({ appId, commentId: comment.id })
      if (!r.ok) setError(r.error ?? "Failed")
    })
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-[color:var(--color-fg)]">
              {name}
            </span>
            {role && (
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
                {role}
              </span>
            )}
            <span className="font-mono text-[10px] text-[color:var(--color-fg-subtle)]">
              {timeAgo}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--color-fg)]">
            {comment.body}
          </p>

          <div className="mt-1 flex items-center gap-3">
            {depth < 3 && (
              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)]"
              >
                <CornerDownRight className="size-3" />
                {replying ? "Cancel" : "Reply"}
              </button>
            )}
            {isOwn && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-danger)] disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Trash2 className="size-3" />
                )}
                Delete
              </button>
            )}
          </div>
          {error && (
            <p className="mt-1 text-[11px] text-[color:var(--color-danger)]">
              {error}
            </p>
          )}

          {replying && (
            <div className="mt-3">
              <CommentForm
                appId={appId}
                parentId={comment.id}
                onDone={() => setReplying(false)}
                compact
              />
            </div>
          )}
        </div>
      </div>

      {comment.children.length > 0 && (
        <ul
          className={cn(
            "mt-4 space-y-4 border-l border-[color:var(--color-border)] pl-4",
            depth === 0 && "ml-4"
          )}
        >
          {comment.children.map((child) => (
            <li key={child.id}>
              <CommentItem
                appId={appId}
                comment={child}
                currentUserId={currentUserId}
                depth={depth + 1}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CommentForm({
  appId,
  parentId,
  onDone,
  compact,
}: {
  appId: string
  parentId?: string
  onDone?: () => void
  compact?: boolean
}) {
  const [value, setValue] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const body = value.trim()
    if (!body) return
    startTransition(async () => {
      const r = await postComment({ appId, body, parentId })
      if (!r.ok) setError(r.error ?? "Failed")
      else {
        setValue("")
        setError(null)
        onDone?.()
      }
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={parentId ? "Write a reply…" : "Leave feedback or ask a question…"}
        rows={compact ? 2 : 3}
        className="block w-full rounded border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] resize-y"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit()
        }}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
          ⌘↵ to send
        </span>
        <div className="flex items-center gap-2">
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || !value.trim()}
            className="inline-flex items-center gap-1.5 rounded bg-[color:var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[color:var(--color-accent-strong)] disabled:opacity-50"
          >
            {pending && <Loader2 className="size-3 animate-spin" />}
            {parentId ? "Reply" : "Post"}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-[color:var(--color-danger)]">{error}</p>
      )}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-accent-softer)] text-[11px] font-semibold text-[color:var(--color-accent)]">
      {initials || "?"}
    </span>
  )
}

function flatCount(nodes: CommentNode[]): number {
  let n = 0
  for (const c of nodes) {
    n += 1 + flatCount(c.children)
  }
  return n
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}
