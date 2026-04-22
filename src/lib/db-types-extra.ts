import type { ApprovalStatus, ApproverRole } from "./db-types"

/** Marketing checklist post-migration 0002. */
export type MarketingChecklist = {
  id: string
  app_id: string
  promoted_tweet: boolean
  proving_ground_article: boolean
  video: boolean
  completed_at: string | null
}

/** A row returned from the approvals table that's enough for progress calc. */
export type ApprovalRow = {
  approver_role: ApproverRole
  status: ApprovalStatus
}
