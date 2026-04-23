-- ============================================================================
-- 0005 — Simplify role set
-- Keep: admin (hidden), cofounder, coo, cto, legal_lead, marketing_lead,
--       taiko_member (new catch-all)
-- Deprecate (kept in enum for safety, unused): pm, engineer
-- Idempotent.
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_role' and e.enumlabel = 'taiko_member'
  ) then
    alter type app_role add value 'taiko_member';
  end if;
end $$;

-- Migrate profiles off the deprecated labels
update public.profiles
  set role = 'taiko_member'
  where role in ('engineer', 'pm');

update public.role_assignments
  set role = 'taiko_member'
  where role in ('engineer', 'pm');

-- New signups default to taiko_member unless they have a pre-assignment
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preassigned app_role;
begin
  select role into preassigned
  from public.role_assignments
  where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(preassigned, 'taiko_member')
  );
  return new;
end;
$$;

-- Allow any Taiko member to submit a new app (not just pm/admin/cto/coo)
drop policy if exists "pm+ can insert apps" on public.apps;
drop policy if exists "members can insert apps" on public.apps;
create policy "members can insert apps" on public.apps
  for insert with check (
    public.current_user_role() in
      ('admin', 'cofounder', 'coo', 'cto', 'legal_lead',
       'marketing_lead', 'taiko_member', 'pm', 'engineer')
  );

-- Allow authors to update their own apps in addition to privileged roles
drop policy if exists "pm+ can update apps" on public.apps;
drop policy if exists "owner or privileged can update apps" on public.apps;
create policy "owner or privileged can update apps" on public.apps
  for update using (
    pm_id = auth.uid()
    or public.current_user_role() in ('admin', 'coo', 'cto')
  );
