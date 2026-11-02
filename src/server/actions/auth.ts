"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { safeNextPath } from "@/lib/safe-redirect"
import { auth } from "@/server/auth"
import { emailHasAccount } from "@/server/services/user"
import { clientIp, hashKey, withinRateLimits } from "@/server/security/rate-limit"
import { signInSchema, signUpSchema } from "@/server/validators/auth"

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
    return { error: FAILED }
  }
  redirect(afterAuthPath(formData.get("next")))
}
