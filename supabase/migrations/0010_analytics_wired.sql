-- ============================================================================
-- 0010 — Add the "Analytics wired" fields to apps.
-- The owner must paste a PostHog project URL during the Refining phase.
-- Structural validation is cheap and happens server-side; we do NOT probe
-- PostHog for events (trust the owner, catch issues later in adoption).
-- Idempotent.
-- ============================================================================

alter table public.apps
  add column if not exists posthog_project_url text,
  add column if not exists posthog_host text,
  add column if not exists analytics_wired_at timestamptz;
