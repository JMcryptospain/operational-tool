# Architectural decisions

A short record of the major technical decisions taken while building
Taiko Launchpad. Written for someone joining the project (or
auditing it) who wants to know the *why*, not just the *what*.

## Stack

### Why Next.js 16 + Server Actions + Supabase

The team is small and the app is mostly forms + tables + emails. Server
Actions remove a whole API layer: the same TypeScript function that
the form calls is the one that hits the database, with full type
safety end to end. Less code, fewer bugs, no REST contract to keep
synced. The trade-off is vendor coupling to the React framework —
acceptable for an internal tool we control fully.

Supabase chosen for: managed Postgres, magic-link auth, Row Level
Security, and a generous free tier that covers Taiko's scale today.
The whole auth gate is *one* server function (`updateSession` in
`src/lib/supabase/middleware.ts`) called from `src/proxy.ts`.

### Why a `proxy.ts` and not `middleware.ts`

Next 16 deprecated the `middleware.ts` file convention in favor of
`proxy.ts`. The behavior is identical; we follow the new convention.
See `src/proxy.ts`.

### Why Resend (not SendGrid / Postmark / Supabase Auth's email)

- Free tier covers our volume comfortably.
- Domain verification is auto-configurable on most DNS providers.
- The SDK is a single dependency, types-first, no surprises.
- Supabase Auth sends magic-link emails fine but doesn't expose a
  generic "send arbitrary email" surface, and doing it through it
  would require shoehorning every notification through the auth
  template system. Cleaner to keep auth emails (Supabase) and
  product emails (Resend) separate.

### Why a single shared PostHog project (not one project per app)

PostHog's free tier caps you at one project. Paying $20/month for
six projects in a tool we use to *measure adoption of small apps* is
backwards. Solution: every app shares one project and identifies
itself via:

1. A PostHog Group: `posthog.group('app', '<slug>')`
2. A property on every event: `posthog.register({ app: '<slug>' })`

Either method lets us filter cleanly per-app on read. The owner
copies a pre-filled snippet from their app's detail page that already
contains the slug + Project Token, so installing analytics on a new
app is one paste.

When we outgrow the free tier (1M events/month) we'll either upgrade
or move to per-project. The data model already records `posthog_*`
columns per app for that future.

## Data model

### Why hand-typed `db-types.ts` instead of generated Supabase types

The Supabase CLI can generate types but binds them to a snapshot of
the schema. We hand-write `src/lib/db-types.ts` because:

- Migrations are short and easy to mirror.
- Hand types stay readable without `Database['public']['Tables']['apps']['Row']` noise.
- The team is small and migrations infrequent.

When migrations get large enough that drift becomes a real risk,
switch to generated types — the change is mechanical.

### Why migrations as numbered SQL files

Standard Supabase / sqitch / dbmate convention. Numbered files apply
in order. Each migration is **idempotent** so re-running it locally is
safe (we use `add column if not exists`, `drop policy if exists ...
create policy ...`, etc.). The `npm run db:migrate` script runs every
file in order via `psql`.

In production we use `supabase db push` (when we wire it) which tracks
applied migrations server-side, so this loose model is a temporary
trade-off for development speed.

### Why Row Level Security on every public table

Defense in depth. The browser holds the anon key by design (it ships
in `NEXT_PUBLIC_*` env vars). RLS makes the anon key inert without a
session: a stolen key gets you nothing. The service-role key (which
*can* bypass RLS) is server-only.

### Why `is_admin` is a separate column from `role`

Originally `role = 'admin'` meant both "tool admin" and "no operational
role". That broke the UX: an admin couldn't *also* be COO without
losing /admin access. Migration 0006 split them. `role` is now strictly
the operational role (cofounder, coo, cto, legal_lead, marketing_lead,
taiko_member). `is_admin` is a separate boolean that gates the /admin
panel only. Approval rights flow from `role`, not `is_admin`.

### Why MVP auto-advances on submit

Submitting an app already implies the owner has built something
(repo URL is required). Holding the app in MVP for an extra step
adds nothing but ceremony. The MVP phase exists in the model for
historical/UI symmetry; in practice it lasts milliseconds.

## Pipeline

### Why approval ≠ "live on mainnet"

Gustavo + Joaquín approving means the app is *cleared* to ship, not
that it *is* shipped. Some apps need a deployment, an on-chain action,
or external coordination after approval. We separated the two states:

- **Stage `launched`**: both approvers signed off
- **`launched_at` set**: the owner has confirmed the app is actually
  live on mainnet

The MKT package only kicks off when `launched_at` is set. Without
this separation, Tiffany would have started the marketing push for
apps that aren't yet shipping.

### Why analytics-wired is gated in Refining (not Launched)

If we asked owners to install analytics post-launch, they'd have to
re-deploy. Asking during Refining (when they're already iterating)
makes it cheap and ensures we have data from day-one of mainnet.

### Why veto can be lifted (not just cast once)

Vetoes are guardrails, not punishment. If a cofounder vetos because
"we should talk about this with legal" and then legal clears it, the
veto should come off. Lifting doesn't delete the historical entry in
`public.vetoes` — that's preserved for audit.

## Cron

### Why a single daily cron (not hourly)

Vercel Hobby plan only allows one cron run per day. Hourly precision
costs $20/month. For a 48-business-hour window, daily resolution
means in the worst case the "expired" reminder lands ~24 hours late —
which is fine because the dashboard already shows the row as overdue
visually before the cron even fires. A reminder that ends up arriving
"24h late" is still useful: the approver still hasn't acted.

If we ever upgrade Vercel, switch the schedule in `vercel.json` to
`0 * * * *` and reduce the worst-case lag without other changes.

### Why no warning email pre-deadline

We removed the "<12h remaining" reminder for two reasons: (1) the
dashboard already flags the row in amber, (2) inbox noise compounds
fast across approvers and apps. The signal/noise ratio of a generic
reminder is poor.

### Why expired sends only to the missing approver(s)

An earlier draft escalated to cofounders. We dropped that: cofounders
have veto rights but not "I'll approve for you" rights. The cleanest
path on overdue is to nudge the same person again — and if they keep
not responding, that's a conversation for offline, not for an email
loop.

## Auth & access

### Why magic links (not Google SSO yet)

Google SSO requires a Google Cloud project + OAuth consent screen
configured under the `taiko.xyz` Workspace, which needed admin access
we didn't have on day one. Magic links use Supabase's built-in flow,
no extra infra. We restrict the email domain server-side. Migrating
to Google later is mechanical (replace the magic-link page; same
session model).

### Why session is 30-day refresh + 1h access (Supabase defaults)

Strikes a balance: an active user is never logged out, an idle user
is forced through magic-link after 30 days of inactivity. Acceptable
for an internal tool.

## Operations

### Why the dev server isn't run from `npm run dev` directly in CI

Local dev runs via `scripts/dev.sh` so the same command works from the
shell, from VS Code tasks, and from the Claude Code preview server.
CI doesn't run a dev server — it runs `next build` + `tsc` + `vitest`
and that's it.

### Why the migration runner is a Node script (not the Supabase CLI)

We started with a small Node helper because installing the Supabase
CLI on every contributor's machine is unnecessary friction for a
team of 5. The runner just iterates `supabase/migrations/*.sql` and
pipes each through `psql`. Switching to `supabase db push` is one
PR away when we need atomic, tracked migrations in production.

## Things explicitly NOT done

- **Slack notifications**: deferred to right before launch so we
  don't wake the team with a half-built bot.
- **Cofounder approval gate**: explicitly rejected. Cofounders have
  veto, not approval. Operational approvals stay with COO + CTO.
- **Per-project PostHog**: not worth $20/month for the volume.
- **Production migration tracking**: we eyeball it on Supabase, since
  we have ~12 migrations total and one developer touching the schema.
