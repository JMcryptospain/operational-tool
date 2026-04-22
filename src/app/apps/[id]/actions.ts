"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  AppRole,
  AppStage,
  ApproverRole,
  ApprovalStatus,
} from "@/lib/db-types"

type ActionResult = { ok: true } | { ok: false; error: string }

/* --- helpers --- */

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  return { supabase, user }
}

async function loadActor() {
  const { supabase, user } = await requireUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .maybeSingle<{
      id: string
      role: AppRole
      full_name: string | null
      email: string
    }>()
  if (!profile) throw new Error("Profile not found")
  return { supabase, user, profile }
}

function canActAsApprover(
  actorRole: AppRole,
  approverRole: ApproverRole
): boolean {
  if (actorRole === "admin") return true
  if (approverRole === "cto" && actorRole === "cto") return true
  if (approverRole === "coo" && actorRole === "coo") return true
  if (approverRole === "legal_lead" && actorRole === "legal_lead") return true
  return false
}

async function logTransition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appId: string,
  fromStage: AppStage | null,
  toStage: AppStage,
  actorId: string,
  notes?: string
) {
  await supabase.from("stage_transitions").insert({
    app_id: appId,
    from_stage: fromStage,
    to_stage: toStage,
    actor_id: actorId,
    notes: notes ?? null,
  })
}

/**
 * Auto-advance stages whose exit criteria are already met. Runs in a loop so
 * a single action can cascade across phases (e.g. if the admin fills every
 * Refining check at once, the app jumps to Ready for Mainnet immediately).
 *
 * Exit rules:
 *   MVP            → Refining   when owner_tested_at is set
 *   Refining       → RFM        when owner_tested + legal approved + monet ready
 *   RFM            → Launched   when both CTO and COO approved
 */
async function autoAdvanceChain(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appId: string,
  actorId: string
) {
  for (let safety = 0; safety < 5; safety++) {
    const { data: app } = await supabase
      .from("apps")
      .select(
        "current_stage, owner_tested_at, monetization_setup_complete"
      )
      .eq("id", appId)
      .maybeSingle<{
        current_stage: AppStage
        owner_tested_at: string | null
        monetization_setup_complete: boolean
      }>()
    if (!app) return

    let nextStage: AppStage | null = null

    if (app.current_stage === "mvp" && app.owner_tested_at) {
      nextStage = "refining"
    } else if (app.current_stage === "refining") {
      const { data: legal } = await supabase
        .from("approvals")
        .select("status")
        .eq("app_id", appId)
        .eq("approver_role", "legal_lead")
        .maybeSingle<{ status: ApprovalStatus }>()
      if (
        app.owner_tested_at &&
        app.monetization_setup_complete &&
        legal?.status === "approved"
      ) {
        nextStage = "ready_for_mainnet"
      }
    } else if (app.current_stage === "ready_for_mainnet") {
      const { data: approvals } = await supabase
        .from("approvals")
        .select("approver_role, status")
        .eq("app_id", appId)
        .in("approver_role", ["cto", "coo"])
        .returns<{ approver_role: ApproverRole; status: ApprovalStatus }[]>()
      const byRole = new Map(
        (approvals ?? []).map((a) => [a.approver_role, a.status])
      )
      if (
        byRole.get("cto") === "approved" &&
        byRole.get("coo") === "approved"
      ) {
        nextStage = "launched"
      }
    }

    if (!nextStage) return

    const patch: Record<string, unknown> = {
      current_stage: nextStage,
      stage_entered_at: new Date().toISOString(),
    }
    if (nextStage === "launched") patch.launched_at = new Date().toISOString()
    if (nextStage === "ready_for_mainnet")
      patch.ready_for_mainnet_window_start = new Date().toISOString()

    await supabase.from("apps").update(patch).eq("id", appId)
    await logTransition(
      supabase,
      appId,
      app.current_stage,
      nextStage,
      actorId,
      "Auto-advanced: all exit criteria met"
    )
  }
}

/* --- Refining phase checks --- */

/** Owner of the app self-declares it is production-ready. */
export async function markOwnerTested(appId: string): Promise<ActionResult> {
  try {
    const { supabase, profile } = await loadActor()

    // Only the app's PM or an admin can flip this.
    const { data: app } = await supabase
      .from("apps")
      .select("pm_id, current_stage, owner_tested_at")
      .eq("id", appId)
      .maybeSingle<{
        pm_id: string
        current_stage: AppStage
        owner_tested_at: string | null
      }>()
    if (!app) return { ok: false, error: "App not found" }

    if (profile.role !== "admin" && app.pm_id !== profile.id) {
      return { ok: false, error: "Only the owner can confirm testing" }
    }
    if (app.current_stage !== "refining" && app.current_stage !== "mvp") {
      return {
        ok: false,
        error: "Testing must be confirmed in MVP or Refining stage",
      }
    }

    const { error } = await supabase
      .from("apps")
      .update({ owner_tested_at: new Date().toISOString() })
      .eq("id", appId)
    if (error) return { ok: false, error: error.message }

    await autoAdvanceChain(supabase, appId, profile.id)
    revalidatePath(`/apps/${appId}`)
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Mark the monetization setup as operationally ready (PM or Jonathan). */
export async function setMonetizationOperative(
  appId: string,
  value: boolean
): Promise<ActionResult> {
  try {
    const { supabase, profile } = await loadActor()
    const { data: app } = await supabase
      .from("apps")
      .select("pm_id")
      .eq("id", appId)
      .maybeSingle<{ pm_id: string }>()
    if (!app) return { ok: false, error: "App not found" }

    const allowed =
      profile.role === "admin" ||
      profile.role === "legal_lead" ||
      profile.id === app.pm_id
    if (!allowed) return { ok: false, error: "Not authorized" }

    const { error } = await supabase
      .from("apps")
      .update({ monetization_setup_complete: value })
      .eq("id", appId)
    if (error) return { ok: false, error: error.message }

    if (value) await autoAdvanceChain(supabase, appId, profile.id)
    revalidatePath(`/apps/${appId}`)
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/* --- Approvals (Legal in Refining, CTO/COO in RFM) --- */

export async function castApproval(input: {
  appId: string
  approverRole: ApproverRole
  decision: Exclude<ApprovalStatus, "pending">
  comment?: string
}): Promise<ActionResult> {
  try {
    const { supabase, profile } = await loadActor()
    if (!canActAsApprover(profile.role, input.approverRole)) {
      return { ok: false, error: "You are not this approver" }
    }

    // Upsert the approval row for (app_id, approver_role).
    const { error } = await supabase.from("approvals").upsert(
      {
        app_id: input.appId,
        approver_role: input.approverRole,
        approver_id: profile.id,
        status: input.decision,
        comment: input.comment ?? null,
        decided_at: new Date().toISOString(),
      },
      { onConflict: "app_id,approver_role" }
    )
    if (error) return { ok: false, error: error.message }

    if (input.decision === "approved")
      await autoAdvanceChain(supabase, input.appId, profile.id)
    revalidatePath(`/apps/${input.appId}`)
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Re-evaluate an app's exit criteria and auto-advance as many stages as
 * apply. Safe to call on page load so that an app that had its checks
 * approved while still on an earlier stage catches up on view.
 */
export async function reconcileAppStage(appId: string): Promise<ActionResult> {
  try {
    const { supabase, profile } = await loadActor()
    await autoAdvanceChain(supabase, appId, profile.id)
    revalidatePath(`/apps/${appId}`)
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/* --- Stage transitions --- */

/**
 * Move an app to the given next stage. The server validates that the stage
 * ordering is legal and, for forward moves, that the exit criteria of the
 * current stage are met.
 */
export async function advanceStage(input: {
  appId: string
  toStage: AppStage
}): Promise<ActionResult> {
  try {
    const { supabase, profile } = await loadActor()

    const { data: app } = await supabase
      .from("apps")
      .select(
        "pm_id, current_stage, owner_tested_at, monetization_setup_complete"
      )
      .eq("id", input.appId)
      .maybeSingle<{
        pm_id: string
        current_stage: AppStage
        owner_tested_at: string | null
        monetization_setup_complete: boolean
      }>()
    if (!app) return { ok: false, error: "App not found" }

    const isPrivileged =
      profile.role === "admin" ||
      profile.role === "cto" ||
      profile.role === "coo"
    const isOwner = app.pm_id === profile.id

    // Exit criteria per current stage
    if (
      app.current_stage === "mvp" &&
      input.toStage === "refining" &&
      !(isOwner || isPrivileged)
    ) {
      return { ok: false, error: "Only the owner can advance from MVP" }
    }

    if (app.current_stage === "refining" && input.toStage === "ready_for_mainnet") {
      // All three refining checks required
      if (!app.owner_tested_at)
        return { ok: false, error: "Owner has not confirmed testing" }
      if (!app.monetization_setup_complete)
        return {
          ok: false,
          error: "Monetization setup is not marked operative",
        }
      const { data: legal } = await supabase
        .from("approvals")
        .select("status")
        .eq("app_id", input.appId)
        .eq("approver_role", "legal_lead")
        .maybeSingle<{ status: ApprovalStatus }>()
      if (!legal || legal.status !== "approved") {
        return { ok: false, error: "Legal approval is required" }
      }
      if (!(isOwner || isPrivileged)) {
        return { ok: false, error: "Only the owner can advance from Refining" }
      }
    }

    if (
      app.current_stage === "ready_for_mainnet" &&
      input.toStage === "launched"
    ) {
      const { data: approvals } = await supabase
        .from("approvals")
        .select("approver_role, status")
        .eq("app_id", input.appId)
        .in("approver_role", ["cto", "coo"])
        .returns<{ approver_role: ApproverRole; status: ApprovalStatus }[]>()
      const byRole = new Map(
        (approvals ?? []).map((a) => [a.approver_role, a.status])
      )
      if (byRole.get("cto") !== "approved" || byRole.get("coo") !== "approved") {
        return { ok: false, error: "Both Gustavo and Joaquín must approve" }
      }
      if (!isPrivileged && !isOwner) {
        return { ok: false, error: "Not authorized" }
      }
    }

    // Perform the update
    const patch: Record<string, unknown> = {
      current_stage: input.toStage,
      stage_entered_at: new Date().toISOString(),
    }
    if (input.toStage === "launched") patch.launched_at = new Date().toISOString()
    if (input.toStage === "ready_for_mainnet")
      patch.ready_for_mainnet_window_start = new Date().toISOString()

    const { error } = await supabase
      .from("apps")
      .update(patch)
      .eq("id", input.appId)
    if (error) return { ok: false, error: error.message }

    await logTransition(
      supabase,
      input.appId,
      app.current_stage,
      input.toStage,
      profile.id
    )

    revalidatePath(`/apps/${input.appId}`)
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/* --- Marketing checks (Tiffany/Marketing Lead) --- */

type MarketingField = "promoted_tweet" | "proving_ground_article" | "video"

export async function setMarketingCheck(input: {
  appId: string
  field: MarketingField
  value: boolean
}): Promise<ActionResult> {
  try {
    const { supabase, profile } = await loadActor()
    if (
      profile.role !== "marketing_lead" &&
      profile.role !== "admin"
    ) {
      return { ok: false, error: "Only Marketing Lead can update this" }
    }

    // Upsert the checklist row
    const { data: existing } = await supabase
      .from("marketing_checklist")
      .select("id")
      .eq("app_id", input.appId)
      .maybeSingle<{ id: string }>()

    if (existing) {
      const patch: Record<string, boolean | string> = {
        [input.field]: input.value,
      }
      const { error } = await supabase
        .from("marketing_checklist")
        .update(patch)
        .eq("id", existing.id)
      if (error) return { ok: false, error: error.message }
    } else {
      const insert: Record<string, unknown> = {
        app_id: input.appId,
        [input.field]: input.value,
      }
      const { error } = await supabase
        .from("marketing_checklist")
        .insert(insert)
      if (error) return { ok: false, error: error.message }
    }

    revalidatePath(`/apps/${input.appId}`)
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/* --- Cofounder veto --- */

export async function castVeto(input: {
  appId: string
  reason: string
}): Promise<ActionResult> {
  try {
    const { supabase, profile } = await loadActor()
    if (profile.role !== "cofounder" && profile.role !== "admin") {
      return { ok: false, error: "Only cofounders can veto" }
    }
    const reason = input.reason.trim()
    if (!reason) return { ok: false, error: "A reason is required" }

    const { data: app } = await supabase
      .from("apps")
      .select("current_stage")
      .eq("id", input.appId)
      .maybeSingle<{ current_stage: AppStage }>()
    if (!app) return { ok: false, error: "App not found" }
    const allowedStages: AppStage[] = [
      "mvp",
      "refining",
      "ready_for_mainnet",
    ]
    if (!allowedStages.includes(app.current_stage)) {
      return { ok: false, error: "Veto window has closed" }
    }

    const { error } = await supabase.from("vetoes").insert({
      app_id: input.appId,
      cofounder_id: profile.id,
      reason,
    })
    if (error) return { ok: false, error: error.message }

    revalidatePath(`/apps/${input.appId}`)
    revalidatePath("/")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
