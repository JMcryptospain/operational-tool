import { notFound, redirect } from "next/navigation"

import { TopNav } from "@/components/top-nav"
import type { AppRole, Profile } from "@/lib/db-types"
import { createClient } from "@/lib/supabase/server"
import {
  PreassignForm,
  PreassignRow,
  ProfileRoleSelect,
} from "./client"

type PreassignmentRow = {
  email: string
  role: AppRole
  created_at: string
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle<Pick<Profile, "id" | "full_name" | "email" | "role">>()

  // Admin gate — non-admins just get a 404.
  if (profile?.role !== "admin") notFound()

  const [{ data: profiles }, { data: preassigned }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: true })
      .returns<
        Array<
          Pick<Profile, "id" | "full_name" | "email" | "role"> & {
            created_at: string
          }
        >
      >(),
    supabase
      .from("role_assignments")
      .select("email, role, created_at")
      .order("created_at", { ascending: true })
      .returns<PreassignmentRow[]>(),
  ])

  const assignedEmails = new Set(
    (profiles ?? []).map((p) => p.email.toLowerCase())
  )
  const pendingPreassignments = (preassigned ?? []).filter(
    (p) => !assignedEmails.has(p.email.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[color:var(--color-bg-subtle)]">
      <TopNav profile={profile ?? null} fallbackEmail={user.email ?? ""} />

      <main className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-10">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-[color:var(--color-fg)]">
            Admin · Team roles
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
            Assign a role to each teammate. Roles gate the approval buttons:
            only the Legal Lead sees the legal approve button, only the CTO
            can approve as Gustavo, etc.
          </p>
        </header>

        {/* Existing profiles */}
        <section className="rounded-lg border border-[color:var(--color-border)] bg-white">
          <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <h2 className="text-sm font-semibold">
              Signed-in users ({profiles?.length ?? 0})
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
              Change role to reassign
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
              <tr>
                <th className="px-5 py-2 text-left font-normal">Name</th>
                <th className="px-5 py-2 text-left font-normal">Email</th>
                <th className="px-5 py-2 text-left font-normal">Role</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[color:var(--color-border)] last:border-b-0"
                >
                  <td className="px-5 py-2.5 text-[color:var(--color-fg)]">
                    {p.full_name ?? "—"}
                  </td>
                  <td className="px-5 py-2.5 text-[color:var(--color-fg-muted)]">
                    {p.email}
                  </td>
                  <td className="px-5 py-2.5">
                    <ProfileRoleSelect
                      profileId={p.id}
                      currentRole={p.role}
                      isSelf={p.id === profile?.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Preassign — for users who haven't logged in yet */}
        <section className="mt-8 rounded-lg border border-[color:var(--color-border)] bg-white">
          <div className="border-b border-[color:var(--color-border)] px-5 py-3">
            <h2 className="text-sm font-semibold">
              Pre-assign roles
            </h2>
            <p className="mt-0.5 text-xs text-[color:var(--color-fg-muted)]">
              Assign a role to an email before they sign in. They'll
              inherit it automatically on first login.
            </p>
          </div>

          <div className="border-b border-[color:var(--color-border)] px-5 py-4">
            <PreassignForm />
          </div>

          {pendingPreassignments.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[color:var(--color-fg-muted)]">
              No pending pre-assignments.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-subtle)]">
                <tr>
                  <th className="px-5 py-2 text-left font-normal">Email</th>
                  <th className="px-5 py-2 text-left font-normal">Role</th>
                  <th className="px-5 py-2 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPreassignments.map((p) => (
                  <PreassignRow key={p.email} email={p.email} role={p.role} />
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  )
}
