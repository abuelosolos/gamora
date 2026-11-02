import { z } from "zod"

export const REPORT_REASONS = ["spam", "harassment", "inappropriate", "copyright", "other"] as const
export const reportReasonSchema = z.enum(REPORT_REASONS)
export type ReportReasonValue = z.infer<typeof reportReasonSchema>

export const REPORT_REASON_LABELS: Record<ReportReasonValue, string> = {
  spam: "Spam",
  harassment: "Harassment or bullying",
  inappropriate: "Inappropriate or harmful content",
  copyright: "Copied or stolen work",
  other: "Something else",
}

export const REPORT_DETAILS_MAX = 500

/**
 * What is being reported. A post and a reply are both "post" here: the server
 * looks the row up and records which one it is, so the client cannot mislabel it.
 * A profile is named by username, the way the page URL names it.
 */
export const reportTargetSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("post"), id: z.uuid() }),
  z.strictObject({ type: z.literal("profile"), username: z.string().trim().min(1).max(30) }),
])
export type ReportTarget = z.infer<typeof reportTargetSchema>

/** Same limit as the database check `reports_details_length`. */
export const createReportSchema = z.strictObject({
  target: reportTargetSchema,
  reason: reportReasonSchema,
  details: z.string().trim().max(REPORT_DETAILS_MAX, `Use ${REPORT_DETAILS_MAX} characters or fewer.`),
})

/** Admin actions name a report only. What happens to the content is decided on the server. */
export const reportIdSchema = z.uuid()

/** The queue filter: open reports, or already handled ones. Anything else means open. */
export const reportQueueSchema = z.enum(["open", "resolved"]).catch("open")
