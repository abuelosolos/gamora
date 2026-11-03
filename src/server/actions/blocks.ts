"use server"

import { revalidatePath } from "next/cache"
import { requireUserForAction } from "@/server/auth/session"
import { withinRateLimits } from "@/server/security/rate-limit"
import { blockUser, unblockUsers } from "@/server/services/blocks"
import { blockUserSchema, unblockUsersSchema } from "@/server/validators/blocks"

export type BlockActionResult =
  | { ok: true }
  | {
      ok: false
      error: "unauthorized" | "rate_limited" | "invalid" | "not_found" | "server"
      message: string
    }

const RATE_LIMITED = { ok: false, error: "rate_limited", message: "Slow down and try again soon." } as const
const SERVER_ERROR = { ok: false, error: "server", message: "Something went wrong. Try again." } as const

/** Everything that lists people or posts can change when a block starts or ends. */
function refreshViews() {
  revalidatePath("/feed")
  revalidatePath("/activity")
  revalidatePath("/u/[username]", "page")
  revalidatePath("/post/[id]", "page")
  revalidatePath("/settings/blocked")
}

/**
 * Pipeline: validate, session, rate limit, write. The blocker is always the
 * session user; the target is named by username. Blocking yourself or a
 * missing profile is refused with a generic message.
 */
export async function blockUserAction(input: unknown): Promise<BlockActionResult> {
  const parsed = blockUserSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "not_found", message: "Profile not found." }

  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to block people." }

  const allowed = await withinRateLimits([
    { name: "block:user", key: session.user.id, limit: 30, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return RATE_LIMITED

  try {
    const outcome = await blockUser(session.user.id, parsed.data.username)
    if (outcome === "not_found") return { ok: false, error: "not_found", message: "Profile not found." }
    if (outcome === "self") return { ok: false, error: "invalid", message: "You cannot block yourself." }
    refreshViews()
    return { ok: true }
  } catch (error) {
    console.error("[block] failed", error instanceof Error ? error.message : "unknown")
    return SERVER_ERROR
  }
}

/** Unblocks one or several people from the caller's own list. Only the caller's rows can match. */
export async function unblockUsersAction(input: unknown): Promise<BlockActionResult> {
  const parsed = unblockUsersSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid", message: "Pick at least one person." }

  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to manage blocked users." }

  const allowed = await withinRateLimits([
    { name: "unblock:user", key: session.user.id, limit: 30, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return RATE_LIMITED

  try {
    await unblockUsers(session.user.id, [...new Set(parsed.data.usernames)])
    refreshViews()
    return { ok: true }
  } catch (error) {
    console.error("[unblock] failed", error instanceof Error ? error.message : "unknown")
    return SERVER_ERROR
  }
}
