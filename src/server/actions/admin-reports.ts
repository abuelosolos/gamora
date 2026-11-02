"use server"

import { revalidatePath } from "next/cache"
import { requireAdminForAction } from "@/server/auth/session"
import { withinRateLimits } from "@/server/security/rate-limit"
import { dismissReport, removeReportedContent } from "@/server/services/admin-reports"
import { deleteImages } from "@/server/storage/process-image"
import { reportIdSchema } from "@/server/validators/reports"

export type AdminReportResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "forbidden" | "rate_limited" | "invalid" | "not_open" | "server"; message: string }

/**
 * Shared front half of both admin actions: validate, admin check, rate limit.
 * The admin flag is read from the database on every call (requireAdminForAction),
 * never from the client. The input is a report id only, so an admin cannot be
 * tricked into deleting something the report does not point at.
 */
async function gate(input: unknown): Promise<{ ok: true; reportId: string; adminId: string } | Extract<AdminReportResult, { ok: false }>> {
  const parsed = reportIdSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid", message: "Report not found." }

  const session = await requireAdminForAction()
  if (!session.ok) {
    return "error" in session && session.error === "forbidden"
      ? { ok: false, error: "forbidden", message: "Not allowed." }
      : { ok: false, error: "unauthorized", message: "Sign in to continue." }
  }

  const allowed = await withinRateLimits([
    { name: "admin-report-action", key: session.user.id, limit: 120, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { ok: false, error: "rate_limited", message: "Slow down and try again soon." }

  return { ok: true, reportId: parsed.data, adminId: session.user.id }
}

/** Dismiss a report. The audit row (admin id, action, report, target, time) is written in the same statement. */
export async function dismissReportAction(input: unknown): Promise<AdminReportResult> {
  const checked = await gate(input)
  if (!checked.ok) return checked
  try {
    const done = await dismissReport({ reportId: checked.reportId, adminId: checked.adminId })
    if (!done) return { ok: false, error: "not_open", message: "This report was already handled." }
    revalidatePath("/admin/reports")
    return { ok: true }
  } catch (error) {
    console.error("[admin] dismiss failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Something went wrong. Try again." }
  }
}

/** Remove the reported content and resolve its reports. Files are deleted after the database change. */
export async function removeContentAction(input: unknown): Promise<AdminReportResult> {
  const checked = await gate(input)
  if (!checked.ok) return checked
  try {
    const plan = await removeReportedContent({ reportId: checked.reportId, adminId: checked.adminId })
    if (!plan) return { ok: false, error: "not_open", message: "This report was already handled." }
    await deleteImages(plan.urls)
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (error) {
    console.error("[admin] remove content failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Something went wrong. Try again." }
  }
}
