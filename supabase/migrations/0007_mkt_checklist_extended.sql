-- ============================================================================
-- 0007 — Extend MKT Basic with two new deliverables requested by ops:
--   - ai_product_listings  (Product Hunt, TAIAT, Futurepedia, etc.)
--   - media_pitch          (pitch to Taiko's media contacts)
-- Idempotent.
-- ============================================================================

alter table public.marketing_checklist
  add column if not exists ai_product_listings boolean not null default false,
  add column if not exists media_pitch boolean not null default false;
