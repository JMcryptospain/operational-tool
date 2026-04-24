-- ============================================================================
-- 0008 — Separate "approved to launch" from "actually live on mainnet".
--
-- Previously `launched_at` was set automatically the moment both CTO and COO
-- approved. That was wrong: approval is not the same as shipping. Now:
--   * apps.current_stage flips to 'launched' on both approvals (same as before)
--   * apps.launched_at stays null until the OWNER clicks "Mark live on mainnet"
--   * the UI and the notifyLaunched email both trigger on that flip.
--
-- Idempotent.
-- ============================================================================

-- Nothing structural to add: launched_at already exists and is nullable. We
-- just stop writing it in autoAdvanceChain (code change, not DB change).
-- Clear launched_at on any app that was auto-stamped by the old logic — so
-- the new "Mark live" button is actionable. Skip apps that are already past
-- Launched (review / active / maintain_only / killed) so we don't clobber
-- real data.
update public.apps
  set launched_at = null
  where launched_at is not null
    and current_stage = 'launched';
