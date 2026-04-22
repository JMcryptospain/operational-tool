"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

type Result = { ok: true } | { ok: false; error: string }

async function requireProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  return { supabase, userId: user.id }
}

export async function postComment(input: {
  appId: string
  body: string
  parentId?: string | null
}): Promise<Result> {
  try {
    const body = input.body.trim()
    if (!body) return { ok: false, error: "Comment cannot be empty" }
    if (body.length > 10_000)
      return { ok: false, error: "Comment is too long (max 10k chars)" }

    const { supabase, userId } = await requireProfile()
    const { error } = await supabase.from("comments").insert({
      app_id: input.appId,
      author_id: userId,
      parent_comment_id: input.parentId ?? null,
      body,
    })
    if (error) return { ok: false, error: error.message }

    revalidatePath(`/apps/${input.appId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function deleteComment(input: {
  appId: string
  commentId: string
}): Promise<Result> {
  try {
    const { supabase, userId } = await requireProfile()
    // RLS also enforces this, but fail fast with a clear error.
    const { data: comment } = await supabase
      .from("comments")
      .select("author_id")
      .eq("id", input.commentId)
      .maybeSingle<{ author_id: string }>()
    if (!comment) return { ok: false, error: "Comment not found" }
    if (comment.author_id !== userId) {
      return { ok: false, error: "You can only delete your own comments" }
    }

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", input.commentId)
    if (error) return { ok: false, error: error.message }

    revalidatePath(`/apps/${input.appId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
