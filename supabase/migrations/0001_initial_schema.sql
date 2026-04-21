-- ============================================================================
-- TAIKO LAUNCHPAD — initial schema (0001)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- ------------------------------- ENUMS --------------------------------------

create type app_role as enum (
  'admin',
  'pm',
  'engineer',
  'cto',
  'coo',
  'legal_lead',
  'marketing_lead',
  'cofounder'
);

create type app_stage as enum (
  'mvp',
  'ready_for_mainnet',
  'monetization_setup',
  'launched',
  'review',
  'active',
  'maintain_only',
  'killed'
);

create type monetization_model as enum (
  'free_for_now',
  'crypto',
  'fiat_stripe',
  'hybrid'
);

create type approval_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type approver_role as enum (
  'cto',
  'coo',
  'legal_lead'
);

create type final_status as enum (
  'active',
  'maintain_only',
  'killed'
);

-- ------------------------------- TABLES -------------------------------------

-- Profiles extend auth.users with app-specific metadata.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role app_role not null default 'engineer',
  created_at timestamptz not null default now()
);

-- Apps in the pipeline.
create table public.apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  value_hypothesis text not null,
  target_user text not null,
  pm_id uuid not null references public.profiles(id),
  repo_url text not null,
  live_url text,
  testing_instructions text,
  monetization_model monetization_model,
  monetization_description text,
  posthog_project_id text,
  current_stage app_stage not null default 'mvp',
  stage_entered_at timestamptz not null default now(),
  ready_for_mainnet_window_start timestamptz,
  launched_at timestamptz,
  review_at timestamptz,
  final_status final_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Approvals required to pass Ready-for-Mainnet (CTO, COO, Legal Lead).
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  approver_role approver_role not null,
  approver_id uuid not null references public.profiles(id),
  delegated_from_id uuid references public.profiles(id),
  status approval_status not null default 'pending',
  decided_at timestamptz,
  comment text,
  created_at timestamptz not null default now(),
  unique (app_id, approver_role)
);

-- Cofounder vetoes (allowed until before mainnet).
create table public.vetoes (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  cofounder_id uuid not null references public.profiles(id),
  reason text not null,
  created_at timestamptz not null default now()
);

-- Per-app delegation of approval rights.
create table public.delegations (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id),
  to_user_id uuid not null references public.profiles(id),
  approver_role approver_role not null,
  created_at timestamptz not null default now(),
  unique (app_id, from_user_id, approver_role)
);

-- Legal deferrals (Jonathan can hold once, max 5 business days).
create table public.legal_deferrals (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  legal_id uuid not null references public.profiles(id),
  justification text not null,
  expires_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Comments / feedback threads on each app.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Audit log of stage transitions.
create table public.stage_transitions (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  from_stage app_stage,
  to_stage app_stage not null,
  actor_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

-- Marketing checklist (Tiffany's launch gate).
create table public.marketing_checklist (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade unique,
  twitter_paid boolean not null default false,
  twitter_unpaid boolean not null default false,
  proving_ground_section boolean not null default false,
  taiko_web boolean not null default false,
  completed_at timestamptz
);

-- Weekly PostHog snapshot (cached to avoid hammering the PostHog API).
create table public.app_metrics (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  week_start date not null,
  weekly_active_users int default 0,
  new_users int default 0,
  pageviews int default 0,
  synced_at timestamptz not null default now(),
  unique (app_id, week_start)
);

-- ------------------------------- INDEXES ------------------------------------

create index idx_apps_current_stage on public.apps(current_stage);
create index idx_apps_pm_id on public.apps(pm_id);
create index idx_approvals_app_id on public.approvals(app_id);
create index idx_comments_app_id on public.comments(app_id);
create index idx_stage_transitions_app_id on public.stage_transitions(app_id);

-- ------------------------------ TRIGGERS ------------------------------------

-- Auto-create profile when a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep apps.updated_at fresh on any update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger apps_set_updated_at
  before update on public.apps
  for each row execute function public.set_updated_at();

-- ------------------------------ RLS -----------------------------------------

alter table public.profiles enable row level security;
alter table public.apps enable row level security;
alter table public.approvals enable row level security;
alter table public.vetoes enable row level security;
alter table public.delegations enable row level security;
alter table public.legal_deferrals enable row level security;
alter table public.comments enable row level security;
alter table public.stage_transitions enable row level security;
alter table public.marketing_checklist enable row level security;
alter table public.app_metrics enable row level security;

-- Helper: get the current user's role from their profile.
create or replace function public.current_user_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---- Profiles ----
create policy "authenticated can read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "self can update profile" on public.profiles
  for update using (id = auth.uid());

-- ---- Apps ----
create policy "authenticated can read apps" on public.apps
  for select using (auth.role() = 'authenticated');
create policy "pm+ can insert apps" on public.apps
  for insert with check (
    public.current_user_role() in ('pm', 'admin', 'cto', 'coo')
  );
create policy "pm+ can update apps" on public.apps
  for update using (
    public.current_user_role() in ('pm', 'admin', 'cto', 'coo')
    or pm_id = auth.uid()
  );

-- ---- Approvals ----
create policy "authenticated can read approvals" on public.approvals
  for select using (auth.role() = 'authenticated');
create policy "authenticated can insert approvals" on public.approvals
  for insert with check (auth.role() = 'authenticated');
create policy "approver can update approval" on public.approvals
  for update using (approver_id = auth.uid());

-- ---- Vetoes ----
create policy "authenticated can read vetoes" on public.vetoes
  for select using (auth.role() = 'authenticated');
create policy "cofounders can insert vetoes" on public.vetoes
  for insert with check (public.current_user_role() = 'cofounder');

-- ---- Delegations ----
create policy "authenticated can read delegations" on public.delegations
  for select using (auth.role() = 'authenticated');
create policy "self can create delegation" on public.delegations
  for insert with check (from_user_id = auth.uid());
create policy "self can delete delegation" on public.delegations
  for delete using (from_user_id = auth.uid());

-- ---- Legal deferrals ----
create policy "authenticated can read deferrals" on public.legal_deferrals
  for select using (auth.role() = 'authenticated');
create policy "legal can manage deferrals" on public.legal_deferrals
  for all using (
    public.current_user_role() in ('legal_lead', 'admin')
    or legal_id = auth.uid()
  );

-- ---- Comments ----
create policy "authenticated can read comments" on public.comments
  for select using (auth.role() = 'authenticated');
create policy "authenticated can insert comments" on public.comments
  for insert with check (author_id = auth.uid());
create policy "author can update comment" on public.comments
  for update using (author_id = auth.uid());
create policy "author can delete comment" on public.comments
  for delete using (author_id = auth.uid());

-- ---- Stage transitions ----
create policy "authenticated can read transitions" on public.stage_transitions
  for select using (auth.role() = 'authenticated');
create policy "authenticated can insert transitions" on public.stage_transitions
  for insert with check (auth.role() = 'authenticated');

-- ---- Marketing checklist ----
create policy "authenticated can read marketing" on public.marketing_checklist
  for select using (auth.role() = 'authenticated');
create policy "marketing can manage" on public.marketing_checklist
  for all using (
    public.current_user_role() in ('marketing_lead', 'admin')
  );

-- ---- App metrics ----
-- Writes happen only via service-role (server-side cron/job), so no insert policy.
create policy "authenticated can read metrics" on public.app_metrics
  for select using (auth.role() = 'authenticated');
