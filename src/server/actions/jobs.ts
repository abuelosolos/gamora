"use server"

import { requireUserForAction } from "@/server/auth/session"
import { withinRateLimits } from "@/server/security/rate-limit"
import { createApplication } from "@/server/services/jobs"
import { applyToJobSchema } from "@/server/validators/jobs"

export type ApplyResult =
  | { ok: true }
  | {
      ok: false
      error: "unauthorized" | "rate_limited" | "invalid" | "not_found" | "already_applied" | "server"
      message: string
    }

/**
 * Apply to a sample job with some of your own posts as portfolio pieces.
 * Order: validate, session, rate limit, then the service, which checks that
 * every picked post is the caller's own before it writes anything.
 */
export async function applyToJobAction(input: unknown): Promise<ApplyResult> {
  const parsed = applyToJobSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid", message: parsed.error.issues[0]?.message ?? "Check your application and try again." }
  }

  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to apply." }
  const { user } = session

  const allowed = await withinRateLimits([
    { name: "job-apply:user", key: user.id, limit: 20, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { ok: false, error: "rate_limited", message: "You are applying a lot. Try again in a little while." }

  try {
    const outcome = await createApplication({ userId: user.id, ...parsed.data })
    if (outcome.ok) return { ok: true }
    switch (outcome.reason) {
      case "job_not_found":
        return { ok: false, error: "not_found", message: "This job is no longer available." }
      case "already_applied":
        return { ok: false, error: "already_applied", message: "You already applied to this job." }
      case "bad_pieces":
        return { ok: false, error: "invalid", message: "One of the works could not be used." }
    }
  } catch (error) {
    console.error("[applyToJob] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Something went wrong. Try again." }
  }
}
