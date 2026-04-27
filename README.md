<!-- markdownlint-disable MD041 -->
# Taiko Launchpad

Internal app-launch pipeline for Taiko Labs. Tracks every app the team
ships from idea to mainnet through five named phases, with role-gated
approvals, hard timers, automated emails, adoption metrics, and a
cofounder veto.

> **Status:** Production. Live at
> [operational-tool.vercel.app](https://operational-tool.vercel.app).

## Why this exists

Taiko ships small, AI-powered apps weekly. Without a shared system
they pile up in Notion docs and Slack threads, approvals fall through,
nobody knows who's blocking what, and adoption gets measured app by
app in scattered tools. Launchpad replaces all that with one canonical
source of truth.

## The pipeline

```
   ┌─── MVP ───────────┐ ┌──── Refining & Legal ────┐ ┌── Ready for Mainnet ──┐ ┌── Launched ──┐ ┌── MKT Basic ──┐
   │                   │ │                          │ │                       │ │              │ │               │
   │ submit a new app  │ │ - Tested end-to-end (PM) │ │ - Gustavo (CTO)       │ │ - Mark live  │ │ - Tweet       │
   │ (auto pass-through│ │ - Legal review (Jonathan)│ │ - Joaquín (COO)       │ │   on mainnet │ │ - Article     │
   │  to Refining)     │ │ - Monetization (Jonathan)│ │                       │ │   (PM)       │ │ - Video       │
   │                   │ │ - Analytics wired (PM)   │ │ 48 business-hour      │ │              │ │ - AI listings │
   │                   │ │                          │ │ window                │ │              │ │ - Media pitch │
   └───────────────────┘ └──────────────────────────┘ └───────────────────────┘ └──────────────┘ └───────────────┘
```

Each phase auto-advances when its exit criteria are met. The auto-chain
runs every time a check is flipped, so a single click can cascade an
app multiple phases forward if the prior gates were already met.

### Roles

| Role | Acts on |
|---|---|
| Co-founder | Veto (any phase before Launched) |
| CTO | Approve in Ready for Mainnet |
| COO | Approve in Ready for Mainnet |
| Legal Lead | Legal review + monetization in Refining |
| MKT Lead | All five MKT Basic checks |
| Taiko Member | Submit & own apps; mark "tested end-to-end" + "live on mainnet" + "analytics wired" on apps they own |
| Admin | Manages users in `/admin`. Decoupled from operational role — the same person can be COO + Admin. |

### Timers

- **Build window:** 10 calendar days from MVP submission to Ready for
  Mainnet. Warning at 7 days, overdue at 10. Surfaced in the dashboard
  table and the detail page.
- **Review window:** 48 business hours (Europe/Madrid, Mon–Fri) for
  CTO+COO to approve in Ready for Mainnet. Daily cron emails the
  approver who hasn't decided once the window closes.

### Cofounder veto

Cofounders (Daniel, Terence) can veto any app while it's still in MVP,
Refining, or Ready for Mainnet. A veto requires a written reason,
pauses the pipeline (no auto-advance), and shows a red banner to the
whole team. Any cofounder can lift the veto.

## Email triggers

Sent via Resend from `noreply@launchpad.taiko.xyz` (verified domain).

| Trigger | Recipient | What it says |
|---|---|---|
| App enters Ready for Mainnet | Gustavo + Joaquín | "Approval needed in 48h." |
| App enters Ready for Mainnet | Owner | "Heads up, you'll hear back from Gustavo+Joaquín in 48h." |
| Both approvers approve | Owner | "Approved to launch on mainnet. Don't forget to mark it live afterwards." |
| Owner marks app live | MKT Lead | "Time to run the MKT Basic package." |
| 48h review window expires | Approver who didn't act | "Past deadline, please decide." |

Everything else is silent — the dashboard is the canonical state.

## Adoption metrics

Each app's detail page surfaces four cards:

- **Pageviews (7d / 30d)** — `$pageview` events
- **Unique users (30d)** — distinct distinct_ids
- **Download clicks (30d)** — `download_clicked` events
- **Paid events (30d) + revenue** — `payment_completed` events with
  `properties.amount`

All apps share a single PostHog project (free tier) and identify
themselves with `posthog.group('app', '<slug>')` + a `properties.app`
field on every event. The owner copies a pre-filled snippet from
the app's detail page and installs it in their app's `<head>` during
Refining.

## Tech stack

- **Next.js 16** (App Router, Server Actions, async cookies, route
  handlers, the `proxy.ts` file convention)
- **TypeScript strict**, ESLint, Tailwind v4
- **Supabase**: Postgres + Row Level Security + Auth (magic-link, email
  domain restricted to `@taiko.xyz`)
- **Resend** for transactional email
- **PostHog** for product analytics
- **Vercel**: hosting + cron (Hobby tier, daily schedule)

## Local development

### Prerequisites

- Node.js 20+ (the project is built on 25)
- A Supabase project (free tier works) with the schema applied — see
  [Initial setup](#initial-setup)
- A Resend project with a verified domain
- A PostHog project (any plan) with a Personal API key

### Setup

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
# fill in the values — see .env.example for what each one means

# 3. Apply database migrations against your Supabase project
npm run db:migrate

# 4. Run the dev server
npm run dev
# http://localhost:3000
```

Magic-link emails will arrive at the address you sign in with, but only
if it ends in `@taiko.xyz`. To loosen this for testing, edit
`ALLOWED_DOMAIN` in `src/app/login/actions.ts`.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server with Turbopack |
| `npm run build` | Production build (also runs typecheck) |
| `npm run start` | Run the production build locally |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply every SQL file in `supabase/migrations/` in order, via `psql`. Requires `SUPABASE_DB_URL`. |

## Initial setup (one-time)

1. **Supabase**
   - Create a project in the Frankfurt region.
   - From Project Settings → API, copy `URL`, `anon` key, and `service_role` key into `.env.local`.
   - From Project Settings → Database, get a Session-pooler URI and paste it into `SUPABASE_DB_URL`.
   - Run `npm run db:migrate`.
   - In Authentication → URL Configuration, add the prod URL to the
     redirect URLs (e.g. `https://operational-tool.vercel.app/**`).
2. **Resend**
   - Add your domain (we use `launchpad.taiko.xyz`) and have your DNS
     admin paste the three records.
   - Create a Personal API Key with sending access; put it in
     `RESEND_API_KEY`.
3. **PostHog**
   - Create a project in EU. Copy its Project Token (public) and ID,
     and create a Personal API Key with Read-only scopes
     (`query:read`, `project:read`, `event_definitions:read`,
     `insight:read`). Fill in the four `POSTHOG_*` vars.
4. **Vercel**
   - Connect the GitHub repo. Copy every value from `.env.local` into
     Vercel → Settings → Environment Variables. Mark sensitive ones
     accordingly.
   - Set a long random `CRON_SECRET`. Vercel Cron sends it as a
     Bearer token; we verify it server-side before running the job.

After deploy, the Vercel project name doesn't matter — you can rename
it freely. The public URL is what matters for Supabase redirect URLs.

## Repo layout

```
src/
  app/                     Next.js App Router routes
    page.tsx                 Dashboard (the table)
    apps/
      actions.ts             createApp server action
      [id]/page.tsx          App detail page
      [id]/actions.ts        All per-app server actions
    admin/                   Role management (admin-only)
    api/cron/rfm-timers/     Daily cron handler
    auth/                    Auth callback + sign-out
    login/                   Email magic-link form
  components/                React components
  lib/
    db-types.ts              Hand-typed schema mirror
    pipeline.ts              Stage status + business-hour timer
    progress.ts              Per-app phase + checks computation
    slug.ts                  App slug helper
    posthog.ts               PostHog HogQL client (server-only)
    email/
      client.ts              Resend wrapper
      templates.ts           HTML/text email layout
      notifications.ts       Per-trigger helpers
    supabase/
      client.ts              Browser client
      server.ts              Server client (cookies)
      middleware.ts          Session refresh + auth gate
  proxy.ts                   Next 16 file convention (was middleware.ts)
supabase/migrations/         Numbered SQL files, applied in order
```

## Architectural decisions

See [DECISIONS.md](./DECISIONS.md) for the why behind the major
choices (single PostHog project, daily-only cron, decoupled admin
flag, Resend over alternatives, etc.).

## Operations

See [OPERATIONS.md](./OPERATIONS.md) for the runbook (how to add a
user, how to look at cron logs, how to verify Resend is healthy, what
to do if a deploy fails, etc.).

## Contributing

This is an internal Taiko tool. Open a PR against `main`; CI runs
typecheck + build + tests on every push. The merge requires green
CI and one review. Branch protections live in GitHub Settings.

## License

UNLICENSED — internal use only.
