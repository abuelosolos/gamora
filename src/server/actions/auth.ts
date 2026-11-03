"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { safeNextPath } from "@/lib/safe-redirect"
import { auth } from "@/server/auth"
import { createProfileForUser, isUniqueViolation, isUsernameTaken } from "@/server/services/profile"
import { processAvatar, storeAvatar } from "@/server/storage/process-image"
import { emailHasAccount, getSignInMethod, type SignInMethod } from "@/server/services/user"
import { clientIp, hashKey, withinRateLimits } from "@/server/security/rate-limit"
import { emailCheckSchema, signInSchema, signUpSchema } from "@/server/validators/auth"
import { AVATAR_MAX_BYTES, completeOnboardingSchema } from "@/server/validators/profile"

export interface AuthFormState {
  /** Form-level message. Always generic for anything that could reveal an account. */
  error?: string
  /** Per-field messages from validation only (shape and length, never account facts). */
  fieldErrors?: Partial<Record<"email" | "password", string>>
}

function fieldErrorsOf(error: z.ZodError): AuthFormState["fieldErrors"] {
  const out: NonNullable<AuthFormState["fieldErrors"]> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if ((key === "email" || key === "password") && !out[key]) out[key] = issue.message
  }
  return out
}

const TOO_MANY ="Too many attempts. Wait a few minutes and try again."
// One message for every failure, so the form never says whether an email has an account.
const FAILED = "That did not work. Check your email and password. New passwords need at least 10 characters."

export type CheckEmailResult =
  | { ok: true; method: SignInMethod }
  | { ok: false; message: string }

const CHECK_FAILED = "Something went wrong. Try again."

/**
 * Step one of the email flow: how does this address sign in? Answers only
 * "password", "google" or "new". That does reveal whether an account exists,
 * which is the product's choice for this flow, so it is limited per IP (30 per
 * 15 minutes) and per hashed email (10 per 15 minutes). Nothing is logged but
 * the limit hits (hashed). No email, no password.
 */
export async function checkEmailAction(input: unknown): Promise<CheckEmailResult> {
  const parsed = emailCheckSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? CHECK_FAILED }

  const { email } = parsed.data
  const allowed = await withinRateLimits([
    { name: "email-check:ip", key: await clientIp(), limit: 30, windowSeconds: 15 * 60 },
    { name: "email-check:email", key: hashKey(email), limit: 10, windowSeconds: 15 * 60 },
  ])
  if (!allowed) return { ok: false, message: TOO_MANY }

  try {
    return { ok: true, method: await getSignInMethod(email) }
  } catch {
    console.error("[auth] email check failed")
    return { ok: false, message: CHECK_FAILED }
  }
}

/** Where to land after auth. /onboarding sends finished users on to `next`. */
function afterAuthPath(next: FormDataEntryValue | null): string {
  const safe = safeNextPath(typeof next === "string" ? next : null)
  return `/onboarding?next=${encodeURIComponent(safe)}`
}

/**
 * One email flow for everyone. Existing accounts sign in (skipping sign-up);
 * unknown emails get an account created with the same password. Wrong
 * password, short password for a new account and any other failure return the
 * same message. Without email verification the two outcomes still differ
 * (new emails proceed), which rate limiting only slows down.
 */
export async function continueWithEmailAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) }

  const { email, password } = parsed.data
  const ip = await clientIp()
  const allowed = await withinRateLimits([
    { name: "sign-in:ip", key: ip, limit: 30, windowSeconds: 15 * 60 },
    { name: "sign-in:account", key: `${hashKey(email)}:${ip}`, limit: 8, windowSeconds: 15 * 60 },
  ])
  if (!allowed) return { error: TOO_MANY }

  const hasAccount = await emailHasAccount(email)

  if (hasAccount) {
    try {
      await auth.api.signInEmail({ body: { email, password }, headers: await headers() })
    } catch {
      // Logged without the email or password: a hash of the email and the IP are enough to spot guessing.
      console.warn(`[auth] sign-in failed account=${hashKey(email)} ip=${ip} at=${new Date().toISOString()}`)
      return { error: FAILED }
    }
    redirect(afterAuthPath(formData.get("next")))
  }

  // New email: create the account.
  if (!signUpSchema.safeParse({ email, password }).success) return { error: FAILED }
  const signUpAllowed = await withinRateLimits([
    { name: "sign-up:ip", key: ip, limit: 5, windowSeconds: 60 * 60 },
    { name: "sign-up:ip-burst", key: ip, limit: 2, windowSeconds: 60 },
  ])
  if (!signUpAllowed) return { error: TOO_MANY }

  try {
    // The real name is collected during onboarding; the part before "@" is a
    // placeholder so the required `name` column is never empty.
    await auth.api.signUpEmail({
      body: { name: email.split("@")[0] ?? "Artist", email, password },
      headers: await headers(),
    })
  } catch {
    console.warn(`[auth] sign-up failed account=${hashKey(email)} ip=${ip} at=${new Date().toISOString()}`)
    return { error: FAILED }
  }
  redirect(afterAuthPath(formData.get("next")))
}

export interface RegisterState {
  error?: string
  /** Which wizard step to send the person back to. */
  field?: "username" | "name" | "account"
}

/**
 * Finishes sign-up for a NEW email: the account is created only now, after the
 * person has chosen a password and answered every onboarding step. Pipeline:
 * validate everything, rate limit, check the email is still new and the
 * username is free, create the account, store the optional picture under the
 * new user's own folder, create the profile, then go on to `next`.
 *
 * Messages stay generic. If the profile cannot be saved after the account was
 * made, the person lands on the normal /onboarding screen to finish there.
 */
export async function registerAccountAction(formData: FormData): Promise<RegisterState> {
  const credentials = signUpSchema.safeParse({ email: formData.get("email"), password: formData.get("password") })
  if (!credentials.success) return { error: FAILED, field: "account" }

  let interests: unknown = []
  try {
    interests = JSON.parse(String(formData.get("interests") ?? "[]"))
  } catch {
    return { error: "Check your details and try again." }
  }
  const profileInput = completeOnboardingSchema.safeParse({
    role: "artist",
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    middleName: formData.get("middleName") ?? "",
    username: formData.get("username"),
    interests,
    avatarUrl: null,
    next: null,
  })
  if (!profileInput.success) {
    const path = profileInput.error.issues[0]?.path[0]
    return {
      error: profileInput.error.issues[0]?.message ?? "Check your details and try again.",
      field: path === "username" ? "username" : path === "interests" ? undefined : "name",
    }
  }

  const avatar = formData.get("avatar")
  if (avatar instanceof File && (avatar.size === 0 || avatar.size > AVATAR_MAX_BYTES)) {
    return { error: "Image must be 2 MB or smaller." }
  }

  const { email, password } = credentials.data
  const data = profileInput.data
  const ip = await clientIp()
  const allowed = await withinRateLimits([
    { name: "sign-up:ip", key: ip, limit: 5, windowSeconds: 60 * 60 },
    { name: "sign-up:ip-burst", key: ip, limit: 2, windowSeconds: 60 },
    { name: "sign-up:email", key: hashKey(email), limit: 5, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { error: TOO_MANY }

  if (await emailHasAccount(email)) return { error: FAILED, field: "account" }
  if (await isUsernameTaken(data.username)) return { error: "This username is taken.", field: "username" }

  const displayName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ")
  let userId: string
  try {
    const created = await auth.api.signUpEmail({
      body: { name: displayName, email, password },
      headers: await headers(),
    })
    userId = created.user.id
  } catch {
    console.warn(`[auth] sign-up failed account=${hashKey(email)} ip=${ip} at=${new Date().toISOString()}`)
    return { error: FAILED, field: "account" }
  }

  const next = safeNextPath(typeof formData.get("next") === "string" ? (formData.get("next") as string) : null)

  let avatarUrl: string | null = null
  if (avatar instanceof File && avatar.size > 0) {
    // A bad or failed picture never blocks the account; it can be added later in Edit profile.
    try {
      const processed = await processAvatar(Buffer.from(await avatar.arrayBuffer()))
      if (processed.ok) avatarUrl = await storeAvatar(userId, processed.data)
    } catch {
      avatarUrl = null
    }
  }

  try {
    await createProfileForUser(userId, displayName, {
      username: data.username,
      role: data.role,
      avatarUrl,
      interests: data.interests,
      isAdmin: false, // a new password account has an unverified email, which never earns admin
    })
  } catch (error) {
    if (!isUniqueViolation(error)) console.error("[auth] profile create failed after sign-up")
    redirect(afterAuthPath(next))
  }
  redirect(next)
}
