-- ============================================================================
-- 0004 — Pre-assigned roles for users who haven't logged in yet.
-- When a new auth.users row arrives, the handle_new_user trigger now looks
-- up role_assignments by email and stamps the profile with that role.
-- Idempotent.
-- ============================================================================

create table if not exists public.role_assignments (
  email text primary key,
  role app_role not null,
  created_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id)
);

alter table public.role_assignments enable row level security;

-- Only admins can read/write role assignments. Anyone else gets nothing.
drop policy if exists "admins read role_assignments" on public.role_assignments;
create policy "admins read role_assignments" on public.role_assignments
  for select using (public.current_user_role() = 'admin');

drop policy if exists "admins manage role_assignments" on public.role_assignments;
create policy "admins manage role_assignments" on public.role_assignments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Update the signup trigger so a new user gets the role that was
-- pre-assigned to their email (falling back to 'engineer').
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
    coalesce(preassigned, 'engineer')
  );
  return new;
end;
$$;
