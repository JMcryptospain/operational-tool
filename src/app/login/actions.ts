"use server"

import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

const ALLOWED_DOMAIN = "taiko.xyz"

export type LoginState = {
  status: "idle" | "sent" | "error"
  message?: string
}

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const rawEmail = formData.get("email")
  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    return { status: "error", message: "Please enter your email." }
  }
  const email = rawEmail.trim().toLowerCase()

  // Restrict to Taiko Workspace domain.
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return {
      status: "error",
      message: `Only @${ALLOWED_DOMAIN} accounts are allowed.`,
    }
  }

  const hdrs = await headers()
  const host = hdrs.get("host") ?? "localhost:3000"
  const protocol = host.startsWith("localhost") ? "http" : "https"
  const origin = `${protocol}://${host}`

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { status: "error", message: error.message }
  }

  return {
    status: "sent",
    message: `Magic link sent to ${email}. Check your inbox.`,
  }
}
