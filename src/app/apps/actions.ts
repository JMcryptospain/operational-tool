"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { MonetizationModel } from "@/lib/db-types"
import { notifyAppSubmitted } from "@/lib/email/notifications"
import { reconcileAppStage } from "./[id]/actions"

export type CreateAppState = {
  status: "idle" | "error" | "success"
  message?: string
  fieldErrors?: Partial<Record<string, string>>
}

const MONETIZATION_MODELS: MonetizationModel[] = [
  "free_for_now",
  "crypto",
  "fiat_stripe",
  "hybrid",
]

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export async function createApp(
  _prev: CreateAppState,
  formData: FormData
): Promise<CreateAppState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: "error", message: "You must be signed in." }
  }

  const name = String(formData.get("name") ?? "").trim()
  const valueHypothesis = String(formData.get("value_hypothesis") ?? "").trim()
  const targetUser = String(formData.get("target_user") ?? "").trim()
  const repoUrl = String(formData.get("repo_url") ?? "").trim()
  const liveUrl = String(formData.get("live_url") ?? "").trim()
  const testingInstructions = String(
    formData.get("testing_instructions") ?? ""
  ).trim()
  const monetizationRaw = String(formData.get("monetization_model") ?? "").trim()
  const monetizationDescription = String(
    formData.get("monetization_description") ?? ""
  ).trim()

  const fieldErrors: Record<string, string> = {}
  if (!name) fieldErrors.name = "Required."
  if (!valueHypothesis)
    fieldErrors.value_hypothesis = "Describe the value in one sentence."
  if (!targetUser) fieldErrors.target_user = "Who is this for?"
  if (!repoUrl) fieldErrors.repo_url = "GitHub repo URL is required."
  else if (!isValidHttpUrl(repoUrl))
    fieldErrors.repo_url = "Must be a valid URL."
  if (liveUrl && !isValidHttpUrl(liveUrl))
    fieldErrors.live_url = "Must be a valid URL."

  let monetizationModel: MonetizationModel | null = null
  if (monetizationRaw) {
    if (!MONETIZATION_MODELS.includes(monetizationRaw as MonetizationModel)) {
      fieldErrors.monetization_model = "Pick a valid option."
    } else {
      monetizationModel = monetizationRaw as MonetizationModel
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    }
  }

  const { data: inserted, error } = await supabase
    .from("apps")
    .insert({
      name,
      value_hypothesis: valueHypothesis,
      target_user: targetUser,
      pm_id: user.id,
      repo_url: repoUrl,
      live_url: liveUrl || null,
      testing_instructions: testingInstructions || null,
      monetization_model: monetizationModel,
      monetization_description: monetizationDescription || null,
      current_stage: "mvp",
    })
    .select("id")
    .single()

  if (error || !inserted) {
    return {
      status: "error",
      message: error?.message ?? "Failed to create app.",
    }
  }

  // Record the initial stage transition for the audit log.
  await supabase.from("stage_transitions").insert({
    app_id: inserted.id,
    from_stage: null,
    to_stage: "mvp",
    actor_id: user.id,
    notes: "App submitted as MVP.",
  })

  // MVP is always a pass-through: the moment an app exists it moves to
  // Refining. Don't send the owner a submit email anymore — it's noise.
  await reconcileAppStage(inserted.id)

  revalidatePath("/")
  redirect(`/apps/${inserted.id}`)
}

// notifyAppSubmitted is no longer fired — kept imported for future hooks.
void notifyAppSubmitted
