"use server"

import { randomUUID } from "node:crypto"
import { put } from "@vercel/blob"
import sharp from "sharp"
import { env } from "@/lib/env.server"
import { safeNextPath } from "@/lib/safe-redirect"
import { requireUserForAction } from "@/server/auth/session"
import { withinRateLimits } from "@/server/security/rate-limit"
import {
  createProfileForUser,
  getProfileByUserId,
  isUniqueViolation,
  isUsernameTaken,
} from "@/server/services/profile"
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
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
  const session = await requireUserForAction()
  if (!session.ok) return { status: "error", message: "Sign in to continue." }

  const parsed = usernameSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid username." }
  }

  const allowed = await withinRateLimits([
    { name: "username-check", key: session.user.id, limit: 40, windowSeconds: 60 },
  ])
  if (!allowed) return { status: "error", message: "Slow down and try again in a moment." }

  return (await isUsernameTaken(parsed.data)) ? { status: "taken" } : { status: "available" }
}

export type AvatarUpload = { ok: true; url: string } | { ok: false; error: string }

/**
 * Re-encodes the upload with sharp (square 512px WebP, metadata stripped). The
 * decoder rejects anything that is not really an image, whatever the client
 * claims in the file type.
 */
export async function uploadAvatarAction(formData: FormData): Promise<AvatarUpload> {
  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "Sign in to continue." }

  const file = formData.get("avatar")
  if (!(file instanceof File)) return { ok: false, error: "Choose an image." }
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Use a JPEG, PNG or WebP image." }
  }
  if (file.size === 0 || file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Image must be 2 MB or smaller." }
  }

  const allowed = await withinRateLimits([
    { name: "avatar-upload", key: session.user.id, limit: 10, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { ok: false, error: "Too many uploads. Try again later." }

  let output: Buffer
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer()
  } catch {
    return { ok: false, error: "That file could not be read as an image." }
  }

  try {
    const blob = await put(`avatars/${session.user.id}/${randomUUID()}.webp`, output, {
      access: "public",
      contentType: "image/webp",
      token: env.BLOB_READ_WRITE_TOKEN,
    })
    return { ok: true, url: blob.url }
  } catch {
    return { ok: false, error: "Upload failed. Try again." }
  }
}

export type CompleteOnboarding =
  | { ok: true; next: string }
  | { ok: false; error: string; field?: "username" | "name" | "avatar" | "interests" }

/** The avatar URL must be a Blob URL under this user's own folder. */
function isOwnAvatarUrl(value: string, userId: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.startsWith(`/avatars/${userId}/`)
    )
  } catch {
    return false
  }
}

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
