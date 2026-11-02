"use server"

import { requireUserForAction } from "@/server/auth/session"
import { withinRateLimits } from "@/server/security/rate-limit"
import { createReport } from "@/server/services/reports"
import { createReportSchema } from "@/server/validators/reports"

export type CreateReportResult =
  | { ok: true }
  | {
      ok: false
      error: "unauthorized" | "rate_limited" | "invalid" | "not_found" | "own_content" | "already_reported" | "server"
      message: string
    }

/**
 * Report a post, reply or profile. Pipeline: validate, session, ownership,
 * rate limit, write.
 *
 * Ownership here means "not yours": the service looks the target up and refuses
 * to let someone report their own content. The reporter is always the session
 * user (no user id in the input). Nothing about the report is shown to the
 * person reported.
 */
export async function createReportAction(input: unknown): Promise<CreateReportResult> {
  // 1. Validate.
  const parsed = createReportSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid", message: parsed.error.issues[0]?.message ?? "Check your report and try again." }
  }

  // 2. Session.
  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to report." }

  // 3. Rate limit.
  const allowed = await withinRateLimits([
    { name: "report-create", key: session.user.id, limit: 10, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { ok: false, error: "rate_limited", message: "Too many reports. Try again in a little while." }

  // 4. Ownership check and write (inside the service).
  try {
    const outcome = await createReport({ reporterId: session.user.id, ...parsed.data })
    switch (outcome) {
      case "created":
        return { ok: true }
      case "not_found":
        return { ok: false, error: "not_found", message: "That is no longer available." }
      case "own_content":
        return { ok: false, error: "own_content", message: "You cannot report your own content." }
      case "already_reported":
        return { ok: false, error: "already_reported", message: "You have already reported this." }
    }
  } catch (error) {
    console.error("[report] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Something went wrong. Try again." }
  }
}
