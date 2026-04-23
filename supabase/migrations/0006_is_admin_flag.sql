-- ============================================================================
-- 0006 — Decouple "admin" privilege from the operational role.
--
-- Before: role='admin' meant both "can manage the tool" AND implicit all-rights
-- over approvals. That forced the only admin to carry a meaningless operational
-- role, which broke the UI.
--
-- After: role is the operational role (cofounder, coo, cto, legal_lead,
-- marketing_lead, taiko_member), and is_admin is a separate boolean flag that
-- gates the admin panel only. Approval buttons now look at the operational
-- role alone; is_admin does not grant approval rights.
-- ============================================================================

-- Add the flag. Default false.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Migrate existing admins: keep their is_admin=true and reset their role so
-- they can choose a meaningful operational role later. Assign coo to the
-- bootstrap admin (Joaquín) since that's his actual role; everyone else
-- currently flagged admin becomes taiko_member and can be promoted from UI.
update public.profiles
  set is_admin = true,
      role     = case
        when lower(email) = 'joaquin@taiko.xyz' then 'coo'::app_role
        else 'taiko_member'::app_role
      end
  where role = 'admin';

-- Update current_user_role() to still return the role as before — we do not
-- want the app code to see the operational role change. Admin status is
-- surfaced via a new helper.
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(is_admin, false) from public.profiles where id = auth.uid();
$$;

-- RLS: role_assignments — loosen from role='admin' to is_admin flag
drop policy if exists "admins read role_assignments" on public.role_assignments;
create policy "admins read role_assignments" on public.role_assignments
  for select using (public.current_user_is_admin());

drop policy if exists "admins manage role_assignments" on public.role_assignments;
create policy "admins manage role_assignments" on public.role_assignments
  for all using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- Insert policy on apps: let any Taiko member (and above) create apps. Admin
-- flag not required for creation, so no change needed on that path.

-- Approvals insert/update gates rely on the UI + server actions, which will
-- be updated to look at role directly (not admin). No RLS change needed.
