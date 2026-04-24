"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { AppRole } from "@/lib/db-types"
import { sendTestEmail } from "@/lib/email/notifications"

type Result = { ok: true } | { ok: false; error: string }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_admin, email")
    .eq("id", user.id)
    .maybeSingle<{
      id: string
      role: AppRole
      is_admin: boolean
      email: string
    }>()
  if (!profile || !profile.is_admin) {
    throw new Error("Admin only")
  }
  return { supabase, profile }
}

/**
 * Operational roles the admin UI is allowed to assign. "admin" is managed
 * via the is_admin flag, not here. Legacy values ("pm", "engineer") are
 * intentionally excluded from what the UI can set going forward.
 */
const VALID_ROLES: AppRole[] = [
  "cofounder",
  "coo",
  "cto",
  "legal_lead",
  "marketing_lead",
  "taiko_member",
]

export async function updateProfileRole(input: {
  profileId: string
  role: AppRole
}): Promise<Result> {
  try {
    const { supabase } = await requireAdmin()
    if (!VALID_ROLES.includes(input.role))
      return { ok: false, error: "Invalid role" }

    // Admin flag lives on a separate column now, so changing your own
    // operational role is safe — it doesn't affect admin privileges.
    const { error } = await supabase
      .from("profiles")
      .update({ role: input.role })
      .eq("id", input.profileId)
    if (error) return { ok: false, error: error.message }

    revalidatePath("/admin")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

const TAIKO_DOMAIN = "taiko.xyz"

export async function preassignRole(input: {
  email: string
  role: AppRole
}): Promise<Result> {
  try {
    const { supabase, profile } = await requireAdmin()
    const email = input.email.trim().toLowerCase()
    if (!email) return { ok: false, error: "Email is required" }
    if (!email.endsWith(`@${TAIKO_DOMAIN}`))
      return { ok: false, error: `Only @${TAIKO_DOMAIN} addresses allowed` }
    if (!VALID_ROLES.includes(input.role))
      return { ok: false, error: "Invalid role" }

    const { error } = await supabase.from("role_assignments").upsert(
      {
        email,
        role: input.role,
        assigned_by: profile.id,
      },
      { onConflict: "email" }
    )
    if (error) return { ok: false, error: error.message }

    // If the user already signed up, apply the role to their profile now.
    await supabase
      .from("profiles")
      .update({ role: input.role })
      .eq("email", email)

    revalidatePath("/admin")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function deletePreassignment(email: string): Promise<Result> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from("role_assignments")
      .delete()
      .eq("email", email.trim().toLowerCase())
    if (error) return { ok: false, error: error.message }
    revalidatePath("/admin")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Send a one-off test email to the acting admin. Lets us verify the Resend
 * integration end-to-end from the admin panel without waiting for a real
 * stage transition.
 */
export async function sendAdminTestEmail(): Promise<Result> {
  try {
    const { profile } = await requireAdmin()
    const r = await sendTestEmail(profile.email)
    return r.ok ? { ok: true } : { ok: false, error: r.error }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
