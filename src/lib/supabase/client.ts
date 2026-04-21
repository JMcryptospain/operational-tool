import { createBrowserClient } from "@supabase/ssr"

/**
 * Supabase client for use in Client Components (React components marked with "use client").
 * Reads the session from browser cookies.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
