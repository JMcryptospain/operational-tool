-- ============================================================================
-- 0012 — Make veto first-class on the app row.
--
-- A cofounder veto is currently stored in public.vetoes but the apps table
-- has no flag, so autoAdvanceChain doesn't know to stop and the dashboard
-- has nothing to query without joining.
--
-- Add apps.vetoed_at + apps.veto_reason. Backfill from existing vetoes.
-- Idempotent.
-- ============================================================================

alter table public.apps
  add column if not exists vetoed_at timestamptz,
  add column if not exists veto_reason text;

-- Backfill from the most recent veto per app, if any.
update public.apps a
  set vetoed_at = v.created_at,
      veto_reason = v.reason
  from (
    select distinct on (app_id) app_id, created_at, reason
    from public.vetoes
    order by app_id, created_at desc
  ) v
  where a.id = v.app_id and a.vetoed_at is null;
