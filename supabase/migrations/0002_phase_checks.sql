-- ============================================================================
-- 0002 — Phase check fields used by the landing timeline
-- Idempotent: safe to re-run.
-- ============================================================================

-- Apps: a boolean telling the landing table whether Monetization Setup is
-- considered done. Jonathan / the PM flip this from the detail page; the
-- actual Stripe or crypto wiring lives outside this app.
alter table public.apps
  add column if not exists monetization_setup_complete boolean not null default false;

-- Marketing checklist: the three tangible launch deliverables.
-- Drop the v1 columns and re-create with the final names if they are still
-- present. Use ADD IF NOT EXISTS so this can be applied to a live db that
-- already went through an intermediate state.
alter table public.marketing_checklist
  add column if not exists promoted_tweet boolean not null default false,
  add column if not exists proving_ground_article boolean not null default false,
  add column if not exists video boolean not null default false;

-- Drop the legacy columns only if they exist.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'marketing_checklist'
      and column_name  = 'twitter_paid'
  ) then
    alter table public.marketing_checklist drop column twitter_paid;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'marketing_checklist'
      and column_name  = 'twitter_unpaid'
  ) then
    alter table public.marketing_checklist drop column twitter_unpaid;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'marketing_checklist'
      and column_name  = 'proving_ground_section'
  ) then
    alter table public.marketing_checklist drop column proving_ground_section;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'marketing_checklist'
      and column_name  = 'taiko_web'
  ) then
    alter table public.marketing_checklist drop column taiko_web;
  end if;
end $$;
