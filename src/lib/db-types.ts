/**
 * Hand-written TypeScript types mirroring the Postgres schema defined in
 * supabase/migrations/0001_initial_schema.sql.
 *
 * Keep this file in sync with the schema. When we wire up the Supabase CLI
 * fully, we can replace this with `supabase gen types typescript`.
 */

export type AppRole =
  | "admin"
  | "cofounder"
  | "coo"
  | "cto"
  | "legal_lead"
  | "marketing_lead"
  | "taiko_member"
  // Deprecated (kept for existing DB rows; not offered in the UI)
  | "pm"
  | "engineer"

export type AppStage =
  | "mvp"
  | "refining"
  | "ready_for_mainnet"
  | "monetization_setup"
  | "launched"
  | "review"
  | "active"
  | "maintain_only"
  | "killed"

export type MonetizationModel =
  | "free_for_now"
  | "crypto"
  | "fiat_stripe"
  | "hybrid"

export type ApprovalStatus = "pending" | "approved" | "rejected"
export type ApproverRole = "cto" | "coo" | "legal_lead"
export type FinalStatus = "active" | "maintain_only" | "killed"

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: AppRole
  is_admin: boolean
  created_at: string
}

export type App = {
  id: string
  name: string
  value_hypothesis: string
  target_user: string
  pm_id: string
  repo_url: string
  live_url: string | null
  testing_instructions: string | null
  monetization_model: MonetizationModel | null
  monetization_description: string | null
  monetization_setup_complete: boolean
  owner_tested_at: string | null
  posthog_project_id: string | null
  posthog_project_url: string | null
  posthog_host: string | null
  analytics_wired_at: string | null
  current_stage: AppStage
  stage_entered_at: string
  ready_for_mainnet_window_start: string | null
  launched_at: string | null
  review_at: string | null
  final_status: FinalStatus | null
  created_at: string
  updated_at: string
}

export type Approval = {
  id: string
  app_id: string
  approver_role: ApproverRole
  approver_id: string
  delegated_from_id: string | null
  status: ApprovalStatus
  decided_at: string | null
  comment: string | null
  created_at: string
}

export type Veto = {
  id: string
  app_id: string
  cofounder_id: string
  reason: string
  created_at: string
}

export type Comment = {
  id: string
  app_id: string
  author_id: string
  parent_comment_id: string | null
  body: string
  created_at: string
}

export type StageTransition = {
  id: string
  app_id: string
  from_stage: AppStage | null
  to_stage: AppStage
  actor_id: string | null
  notes: string | null
  created_at: string
}
