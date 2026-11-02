"use server"

import { revalidatePath } from "next/cache"
import { requireUserForAction } from "@/server/auth/session"
import { withinRateLimits } from "@/server/security/rate-limit"
import { deleteUserAccount } from "@/server/services/account"
import { deleteAllUserFiles } from "@/server/storage/user-files"
import { deleteAccountSchema } from "@/server/validators/account"

export type DeleteAccountResult =
  | { ok: true }
  | {
      ok: false
      error: "unauthorized" | "rate_limited" | "invalid" | "server"
      message: string
    }

/**
 * Delete the signed-in user's account. Pipeline: validate, session, ownership,
 * rate limit, write.
 *
 * Ownership: the input carries no user id. The account removed is the session
 * user's, so nobody can delete someone else's account by sending an id.
 * The database goes first (one cascading delete), then the uploaded files, so a
 * failure can never leave a live account with its pictures gone. If the file
 * cleanup fails the account is already deleted, and the failure is logged.
 */
export async function deleteAccountAction(input: unknown): Promise<DeleteAccountResult> {
  // 1. Validate.
  const parsed = deleteAccountSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid", message: "Confirm that you want to delete your account." }
  }

  // 2. Session.
  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to continue." }
  const { user } = session

  // 3. Ownership: the target is the session user (no id comes from the client).

  // 4. Rate limit. Deleting is rare, so the budget is small.
  const allowed = await withinRateLimits([
    { name: "account-delete", key: user.id, limit: 3, windowSeconds: 60 * 60 },
  ])
  if (!allowed) {
    return { ok: false, error: "rate_limited", message: "Too many attempts. Try again in a little while." }
  }

  // 5. Write.
  try {
    const deleted = await deleteUserAccount(user.id)
    if (!deleted) return { ok: false, error: "invalid", message: "This account no longer exists." }
  } catch (error) {
    console.error("[delete-account] database delete failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Could not delete your account. Try again." }
  }

  const { failed } = await deleteAllUserFiles(user.id)
  if (failed > 0) console.error("[delete-account] some uploaded files were not removed", failed)

  revalidatePath("/", "layout")
  return { ok: true }
}
