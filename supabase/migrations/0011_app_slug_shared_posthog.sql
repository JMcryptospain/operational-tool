-- ============================================================================
-- 0011 — Simplify analytics: one shared PostHog project, per-app slug.
-- Free tier only allows 1 project, so each app is identified via a
-- "group" (PostHog Groups) or a properties.app_slug on every event.
--
-- - Adds apps.slug (unique, slugified app name) — used everywhere we
--   need to identify the app in analytics.
-- - Drops the requirement for posthog_project_url to mean "wired":
--   columns stay for optional self-hosted or future multi-project,
--   but the "Analytics wired" check is now driven by analytics_wired_at
--   only, set when the owner confirms the snippet is installed.
-- Idempotent.
-- ============================================================================

alter table public.apps
  add column if not exists slug text;

-- Backfill slugs for existing apps based on their name. Lowercase, dashes,
-- trim to 48 chars, append short-id suffix to guarantee uniqueness.
update public.apps
  set slug = lower(
    substring(
      regexp_replace(
        regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
        '^-+|-+$', '', 'g'
      ),
      1, 48
    )
  ) || '-' || substring(id::text, 1, 6)
  where slug is null;

-- Enforce not-null and unique going forward
alter table public.apps
  alter column slug set not null;

create unique index if not exists apps_slug_unique on public.apps(slug);
