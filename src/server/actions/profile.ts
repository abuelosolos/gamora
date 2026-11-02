"use server"

import { revalidatePath } from "next/cache"
import { requireUserForAction } from "@/server/auth/session"
import { withinRateLimits } from "@/server/security/rate-limit"
import { isUniqueViolation, updateOwnProfile } from "@/server/services/profile"
import { isOwnAvatarUrl } from "@/server/storage/blob-urls"
import { deleteImages } from "@/server/storage/process-image"
import { updateProfileSchema } from "@/server/validators/profile"

export type UpdateProfileResult =
  | { ok: true; username: string }
  | {
      ok: false
      error: "unauthorized" | "rate_limited" | "invalid" | "username_taken" | "server"
      message: string
      field?: "displayName" | "username" | "bio" | "avatar" | "categories" | "location" | "birthday"
    }

/**
 * Edit profile. Pipeline: validate, session, ownership, rate limit, write.
 *
 * There is no user id in the input. The profile that changes is the session
 * user's, and the avatar URL must be a file under that user's own folder
 * (the upload action put it there). Anyone else's file, or any other URL, is
 * refused. The old avatar file is removed once the new one is saved.
 */
export async function updateProfileAction(input: unknown): Promise<UpdateProfileResult> {
  // 1. Validate.
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path[0]
    return {
      ok: false,
      error: "invalid",
      message: issue?.message ?? "Check your details and try again.",
      field:
        path === "displayName" ||
        path === "username" ||
        path === "bio" ||
        path === "categories" ||
        path === "location" ||
        path === "birthday"
          ? path
          : path === "avatarUrl"
            ? "avatar"
            : undefined,
    }
  }
  const data = parsed.data

  // 2. Session.
  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to continue." }
  const { user } = session

  // 3. Ownership: the avatar must be this user's own upload.
  if (data.avatarUrl && !isOwnAvatarUrl(data.avatarUrl, user.id)) {
    return { ok: false, error: "invalid", message: "That picture could not be used.", field: "avatar" }
  }

  // 4. Rate limit.
  const allowed = await withinRateLimits([
    { name: "profile-update", key: user.id, limit: 10, windowSeconds: 60 * 60 },
  ])
  if (!allowed) {
    return { ok: false, error: "rate_limited", message: "Too many changes. Try again in a little while." }
  }

  // 5. Write. The user id comes from the session and is the WHERE clause.
  try {
    const result = await updateOwnProfile(user.id, data)
    if (!result) return { ok: false, error: "invalid", message: "Finish setting up your profile first." }

    const { previousAvatarUrl } = result
    if (previousAvatarUrl && previousAvatarUrl !== data.avatarUrl && isOwnAvatarUrl(previousAvatarUrl, user.id)) {
      await deleteImages([previousAvatarUrl])
    }
    // Drop cached pages (including the browser's router cache) so the new
    // name, bio, avatar and categories show on the profile and in the feed.
    revalidatePath("/", "layout")
    return { ok: true, username: data.username }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "username_taken", message: "This username is taken.", field: "username" }
    }
    console.error("[updateProfile] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Something went wrong. Try again." }
  }
}
