-- ============================================================================
-- 0009 — Track RFM reminders to avoid sending duplicates from the cron job.
-- One row per (app_id, kind) so we can say "warning already sent" or
-- "expired already sent" and skip on the next cron tick.
-- Idempotent.
-- ============================================================================

create table if not exists public.rfm_reminders_sent (
  app_id uuid not null references public.apps(id) on delete cascade,
  kind text not null check (kind in ('warning', 'expired')),
  sent_at timestamptz not null default now(),
  primary key (app_id, kind)
);

alter table public.rfm_reminders_sent enable row level security;

-- Reads open to authenticated users (useful for an audit panel later);
-- writes only via the service-role key from the cron handler.
drop policy if exists "authenticated can read rfm reminders" on public.rfm_reminders_sent;
create policy "authenticated can read rfm reminders" on public.rfm_reminders_sent
  for select using (auth.role() = 'authenticated');
