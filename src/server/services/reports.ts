import "server-only"
import { eq } from "drizzle-orm"
import { db } from "@/server/db"
import { posts, profile, reports } from "@/server/db/schema"
import { isUniqueViolation } from "@/server/services/profile"
import type { ReportReasonValue, ReportTarget } from "@/server/validators/reports"

export type CreateReportOutcome = "created" | "not_found" | "own_content" | "already_reported"

/**
 * Saves a report. The server decides what the target is: a post row with a
 * parent is a reply, and a profile is looked up by username and stored by user
 * id. Reporting your own content is refused, and one person can report an item
 * once (unique index; a double tap lands here as already_reported).
 */
export async function createReport(params: {
  reporterId: string
  target: ReportTarget
  reason: ReportReasonValue
  details: string
}): Promise<CreateReportOutcome> {
  const { reporterId, target } = params

  let targetType: "post" | "reply" | "profile"
  let targetId: string

  if (target.type === "post") {
    const [row] = await db
      .select({ id: posts.id, authorId: posts.authorId, parentId: posts.parentId })
      .from(posts)
      .where(eq(posts.id, target.id))
      .limit(1)
    if (!row) return "not_found"
    if (row.authorId === reporterId) return "own_content"
    targetType = row.parentId ? "reply" : "post"
    targetId = row.id
  } else {
    const [row] = await db
      .select({ userId: profile.userId })
      .from(profile)
      .where(eq(profile.username, target.username))
      .limit(1)
    if (!row) return "not_found"
    if (row.userId === reporterId) return "own_content"
    targetType = "profile"
    targetId = row.userId
  }

  try {
    await db.insert(reports).values({
      reporterId,
      targetType,
      targetId,
      reason: params.reason,
      details: params.details,
    })
    return "created"
  } catch (error) {
    if (isUniqueViolation(error)) return "already_reported"
    throw error
  }
}
