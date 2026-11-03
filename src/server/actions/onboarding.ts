"use server"

import { env } from "@/lib/env.server"
import { safeNextPath } from "@/lib/safe-redirect"
import { requireUserForAction } from "@/server/auth/session"
import { clientIp, withinRateLimits } from "@/server/security/rate-limit"
import { isOwnAvatarUrl } from "@/server/storage/blob-urls"
import { processAvatar, storeAvatar } from "@/server/storage/process-image"
import {
  createProfileForUser,
  getProfileByUserId,
  isUniqueViolation,
  isUsernameTaken,
} from "@/server/services/profile"
import {
  AVATAR_MAX_BYTES,
  completeOnboardingSchema,
  usernameSchema,
  type CompleteOnboardingInput,
} from "@/server/validators/profile"

export type UsernameCheck =
  | { status: "available" }
  | { status: "taken" }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string }

/** Live check while typing. Usernames are public, so "taken" is not a secret. */
export async function checkUsernameAction(raw: string): Promise<UsernameCheck> {
  // Also used before the account exists (sign-up wizard), so signed-out callers
  // are allowed and limited by IP instead of by user.
  const session = await requireUserForAction()

  const parsed = usernameSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid username." }
  }

  const allowed = await withinRateLimits([
    { name: "username-check", key: session.ok ? session.user.id : `ip:${await clientIp()}`, limit: 40, windowSeconds: 60 },
  ])
  if (!allowed) return { status: "error", message: "Slow down and try again in a moment." }

  return (await isUsernameTaken(parsed.data)) ? { status: "taken" } : { status: "available" }
}

export type AvatarUpload = { ok: true; url: string } | { ok: false; error: string }

const AVATAR_ERRORS = {
  unsupported_type: "Use a JPEG, PNG or WebP image.",
  too_large_dimensions: "Image can be at most 6000 px on each side.",
  invalid_image: "That file could not be read as an image.",
} as const

/**
 * Avatar upload, used by onboarding and edit profile. Size and rate limit are
 * checked first; then the file goes through the same pipeline as post images
 * (real type from the first bytes, 6000 px cap, re-encode to a 512 px WebP with
 * metadata dropped) and is stored under the user's own folder with a random name.
 * The file type the browser sends is not trusted.
 */
export async function uploadAvatarAction(formData: FormData): Promise<AvatarUpload> {
  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "Sign in to continue." }

  const file = formData.get("avatar")
  if (!(file instanceof File)) return { ok: false, error: "Choose an image." }
  if (file.size === 0 || file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Image must be 2 MB or smaller." }
  }

  const allowed = await withinRateLimits([
    { name: "avatar-upload", key: session.user.id, limit: 10, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { ok: false, error: "Too many uploads. Try again later." }

  const processed = await processAvatar(Buffer.from(await file.arrayBuffer()))
  if (!processed.ok) return { ok: false, error: AVATAR_ERRORS[processed.error] }

  try {
    return { ok: true, url: await storeAvatar(session.user.id, processed.data) }
  } catch {
    return { ok: false, error: "Upload failed. Try again." }
  }
}

export type CompleteOnboarding =
  | { ok: true; next: string }
  | { ok: false; error: string; field?: "username" | "name" | "avatar" | "interests" }

function adminEmails(): Set<string> {
  return new Set(
    env.ADMIN_EMAILS.split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  )
}

export async function completeOnboardingAction(
  input: CompleteOnboardingInput
): Promise<CompleteOnboarding> {
  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "Sign in to continue." }
  const { user } = session

  const parsed = completeOnboardingSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path[0]
    return {
      ok: false,
      error: issue?.message ?? "Check your details and try again.",
      field:
        path === "username"
          ? "username"
          : path === "firstName" || path === "lastName" || path === "middleName"
            ? "name"
            : path === "interests"
              ? "interests"
              : undefined,
    }
  }
  const data = parsed.data

  if (data.avatarUrl && !isOwnAvatarUrl(data.avatarUrl, user.id)) {
    return { ok: false, error: "That picture could not be used.", field: "avatar" }
  }

  const allowed = await withinRateLimits([
    { name: "onboarding", key: user.id, limit: 10, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { ok: false, error: "Too many attempts. Try again later." }

  // Ownership: the profile row is keyed by the session user and can only be created once.
  if (await getProfileByUserId(user.id)) {
    return { ok: true, next: safeNextPath(data.next) }
  }

  const displayName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ")
  // The admin flag is only granted to a verified email (Google), because an
  // unverified address proves nothing about who typed it.
  const isAdmin = user.emailVerified && adminEmails().has(user.email.toLowerCase())

  try {
    await createProfileForUser(user.id, displayName, {
      username: data.username,
      role: data.role,
      avatarUrl: data.avatarUrl,
      interests: data.interests,
      isAdmin,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "This username is taken.", field: "username" }
    }
    return { ok: false, error: "Something went wrong. Try again." }
  }

  return { ok: true, next: safeNextPath(data.next) }
}
