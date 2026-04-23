# Taiko Launchpad

Internal app-launch pipeline for Taiko Labs. Tracks every app from MVP to
mainnet through five phases: **MVP → Refining & Legal → Ready for
Mainnet → Launched → MKT Basic**.

Built with Next.js 16, Tailwind v4, Supabase (auth + Postgres), and
deployed on Vercel.

## Phases & responsibilities

| Phase               | Who acts                                           |
| ------------------- | -------------------------------------------------- |
| MVP                 | Product Manager submits the app                    |
| Refining & Legal    | Owner tests + Jonathan legal + monetization ready  |
| Ready for Mainnet   | Gustavo (CTO) + Joaquín (COO), 48h review window   |
| Launched            | App is live on mainnet                             |
| MKT Basic           | Marketing Lead: promoted tweet, article, video     |

- 10-day build window from MVP to Ready for Mainnet.
- 48 business hours (Europe/Madrid, Mon–Fri) in Ready for Mainnet.
- Per-app feedback thread, role-gated approvals, admin role management.

## Local dev

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase values.
3. `npm run db:migrate` to apply SQL migrations.
4. `npm run dev` → http://localhost:3000

## Deployment

Deployed on Vercel, linked to this repo. Supabase runs the database and
auth (magic links restricted to `@taiko.xyz`).
