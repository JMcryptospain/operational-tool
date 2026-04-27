# Operations runbook

Common tasks for someone running Taiko Launchpad day-to-day.

## Adding a teammate

Two paths.

**A. They've already signed in.** Open `/admin`, find their row, set
their role from the dropdown. Done.

**B. They haven't signed in yet.** Open `/admin`, scroll to *Pre-assign
roles*, type their `@taiko.xyz` email, pick a role, click Pre-assign.
On their first login they're stamped with that role automatically.

## Removing a teammate

Open `/admin`, find their row, click Remove. The auth.users record
stays — the user can still sign in, they just become a fresh Taiko
Member (or whatever pre-assignment matches their email). If they own
apps the deletion is blocked; reassign or delete the apps first.

## Promoting someone to admin

Admin (the tool privilege, not an operational role) is intentionally
not assignable from the UI to keep it secure. To grant admin:

```sql
update public.profiles set is_admin = true
  where email = 'their.email@taiko.xyz';
```

Run from the Supabase SQL editor. To revoke, set it to false.

## Verifying email delivery

1. Open `/admin`. Click *Send test email* in the header. Should arrive
   at your inbox in <30s.
2. If it fails, check Resend dashboard → Logs. Common causes:
   - Domain verification regressed (DNS record removed). Resend marks
     it as "Failed".
   - API key revoked. Generate a new one and update `RESEND_API_KEY`
     in Vercel.

## Looking at the daily cron

Vercel → operational-tool → Cron Jobs. You'll see the last few runs
with timestamps and a Logs link. The endpoint is
`/api/cron/rfm-timers` and runs at `0 8 * * *` (08:00 UTC = 09:00
Madrid in winter, 10:00 in DST).

If a run fails, the JSON response in Logs explains why. The handler
also writes to `public.rfm_reminders_sent` only after a successful
email send, so re-running the cron manually is safe (it won't double
send).

## Triggering the cron manually

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://operational-tool.vercel.app/api/cron/rfm-timers
```

You'll get JSON back. `processed: N` tells you how many apps were
inspected; the `summary` array tells you what happened to each.

## Adoption metrics aren't showing

Check the order:

1. The owner has set the *Analytics wired* check on the app.
   Without that, the panel is intentionally dimmed.
2. The owner has installed the snippet in their app and emitted at
   least one event. Visit the app once and reload the detail page.
3. Server-side env vars (`POSTHOG_PERSONAL_API_KEY`,
   `POSTHOG_PROJECT_ID`) are set in Vercel. The detail page logs to
   the server console if PostHog rejects the query.

PostHog responses are cached for 5 minutes. If you just emitted an
event and the cards still show `—`, wait or push any change to bust
the cache.

## Database migrations

Add a new SQL file in `supabase/migrations/` with a sequential prefix
(e.g. `0013_my_change.sql`). Make it idempotent (`if not exists`,
`drop if exists / create`). Apply with `npm run db:migrate`.

Always commit migrations with the code changes that depend on them.
Reviewers need to see both together.

## Production redeploy after env var change

Env vars are baked at build time for `NEXT_PUBLIC_*` and read at
runtime for the rest, but Vercel still requires a fresh build for
runtime ones to load. After editing env vars in
Vercel → Settings → Environment Variables, go to Deployments and
*Redeploy* the latest one.

## Rolling back

Each deploy on Vercel keeps the previous build live. Vercel →
Deployments → find the previous green one → ⋯ → Promote to
Production. That swaps the URL in seconds; it doesn't re-run a build.

For a code rollback, `git revert` the offending commit and push —
the auto-deploy publishes the revert.

For a database rollback, write a new migration that undoes the
change. We don't down-migrations; rolling forward is safer.

## Common pitfalls

- **A new teammate sees only their own apps.** They probably weren't
  pre-assigned a role. Open `/admin`, change them from Taiko Member
  to whatever they actually do (CTO, MKT Lead, etc.).
- **A vetoed app has stuck checks.** That's by design: a vetoed app
  cannot auto-advance even if its checks complete. Lift the veto
  first.
- **Build window is overdue but the app is fine.** The 10-day
  build window is informational, not enforced. Apps don't get
  killed automatically. The amber/red flag is meant to prompt a
  conversation, not block work.
