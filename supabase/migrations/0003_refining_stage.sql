-- ============================================================================
-- 0003 — Add the "Refining" stage between MVP and Ready for Mainnet
-- Idempotent.
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_stage' and e.enumlabel = 'refining'
  ) then
    alter type app_stage add value 'refining' before 'ready_for_mainnet';
  end if;

  -- Mark the app as owner-tested (PM self-declaration at end of Refining).
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'apps'
      and column_name  = 'owner_tested_at'
  ) then
    alter table public.apps
      add column owner_tested_at timestamptz;
  end if;
end $$;
