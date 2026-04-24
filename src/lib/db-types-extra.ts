import type { ApprovalStatus, ApproverRole } from "./db-types"

/** Marketing checklist — see migrations 0002 + 0007. */
export type MarketingChecklist = {
  id: string
  app_id: string
  promoted_tweet: boolean
  proving_ground_article: boolean
  video: boolean
  ai_product_listings: boolean
  media_pitch: boolean
  completed_at: string | null
}

/** A row returned from the approvals table that's enough for progress calc. */
export type ApprovalRow = {
  approver_role: ApproverRole
  status: ApprovalStatus
}
