import "server-only"
import { desc, eq, ne, or, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { postImages, posts, profile, reports, user } from "@/server/db/schema"

/**
 * Admin side of reports. Callers (the /admin pages and the admin actions) must
 * already have passed requireAdmin / requireAdminForAction: nothing in here
 * checks who is asking.
 */

export interface ReportRow {
  id: string
  targetType: "post" | "reply" | "profile"
  reason: "spam" | "harassment" | "inappropriate" | "copyright" | "other"
  status: "open" | "dismissed" | "content_removed"
  createdAt: Date
}

export async function listReports(queue: "open" | "resolved"): Promise<ReportRow[]> {
  return db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(queue === "open" ? eq(reports.status, "open") : ne(reports.status, "open"))
    .orderBy(desc(reports.createdAt))
    .limit(50)
}

export type ReportedContent =
  | {
      kind: "post"
      id: string
      body: string
      images: { url: string; altText: string }[]
      author: { name: string; username: string }
    }
  | { kind: "profile"; username: string; name: string; bio: string; avatarUrl: string | null }

export interface ReportDetail extends ReportRow {
  details: string
  resolvedAt: Date | null
  /** Null when the content is already gone (deleted by its author or by an admin). */
  content: ReportedContent | null
}

/** One report and the content it points at. The reporter's identity is not returned. */
export async function getReportDetail(reportId: string): Promise<ReportDetail | null> {
  const [report] = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      status: reports.status,
      details: reports.details,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
    })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)
  if (!report) return null

  let content: ReportedContent | null = null

  if (report.targetType === "profile") {
    const [row] = await db
      .select({ username: profile.username, name: user.name, bio: profile.bio, avatarUrl: profile.avatarUrl })
      .from(profile)
      .innerJoin(user, eq(user.id, profile.userId))
      .where(eq(profile.userId, report.targetId))
      .limit(1)
    if (row) content = { kind: "profile", ...row }
  } else {
    const [row] = await db
      .select({ id: posts.id, body: posts.body, name: user.name, username: profile.username })
      .from(posts)
      .innerJoin(user, eq(user.id, posts.authorId))
      .innerJoin(profile, eq(profile.userId, posts.authorId))
      .where(eq(posts.id, report.targetId))
      .limit(1)
    if (row) {
      const images = await db
        .select({ url: postImages.url, altText: postImages.altText })
        .from(postImages)
        .where(eq(postImages.postId, row.id))
        .orderBy(postImages.position)
      content = { kind: "post", id: row.id, body: row.body, images, author: { name: row.name, username: row.username } }
    }
  }

  return {
    id: report.id,
    targetType: report.targetType,
    reason: report.reason,
    status: report.status,
    details: report.details,
    createdAt: report.createdAt,
    resolvedAt: report.resolvedAt,
    content,
  }
}

/**
 * Dismiss: marks the report dismissed and writes the audit row in ONE statement
 * (a CTE), so the log can never be missing for a change that happened. Only an
 * open report matches, so a second click, or two admins, cannot act twice.
 * All values are bound parameters.
 */
export async function dismissReport(params: { reportId: string; adminId: string }): Promise<boolean> {
  const result = await db.execute(sql`
    with upd as (
      update reports
         set status = 'dismissed', resolved_at = now(), resolved_by = ${params.adminId}
       where id = ${params.reportId} and status = 'open'
      returning id, target_type, target_id
    )
    insert into admin_actions (id, admin_id, action, report_id, target_type, target_id)
    select gen_random_uuid()::text, ${params.adminId}, 'dismiss_report', id, target_type, target_id from upd
    returning report_id
  `)
  return result.rows.length > 0
}

export interface RemovalPlan {
  /** Blob files to delete once the database change has gone through. */
  urls: string[]
}

/**
 * Remove the reported content and resolve every open report on it, writing one
 * audit row per resolved report, all in ONE statement. The content change is
 * guarded by "this report is still open", so a repeated call does nothing.
 *
 *   post or reply: the post row is deleted (its images, replies, likes and so
 *                  on cascade); its Blob files are returned for cleanup.
 *   profile:       the bio is cleared and the avatar removed. The account, its
 *                  posts and its username are left alone: a profile report is
 *                  about what the profile shows, and deleting a person's account
 *                  is a bigger decision than this screen makes.
 *
 * Returns null when the report was not open (nothing was changed).
 */
export async function removeReportedContent(params: { reportId: string; adminId: string }): Promise<RemovalPlan | null> {
  const [report] = await db
    .select({ targetType: reports.targetType, targetId: reports.targetId, status: reports.status })
    .from(reports)
    .where(eq(reports.id, params.reportId))
    .limit(1)
  if (!report || report.status !== "open") return null

  // Files first (read only); they are deleted after the database change succeeds.
  let urls: string[] = []
  if (report.targetType === "profile") {
    const [row] = await db.select({ avatarUrl: profile.avatarUrl }).from(profile).where(eq(profile.userId, report.targetId)).limit(1)
    if (row?.avatarUrl) urls = [row.avatarUrl]
  } else {
    const rows = await db
      .select({ url: postImages.url })
      .from(postImages)
      .innerJoin(posts, eq(posts.id, postImages.postId))
      .where(or(eq(posts.id, report.targetId), eq(posts.parentId, report.targetId)))
    urls = rows.map((row) => row.url)
  }

  const stillOpen = sql`exists (select 1 from reports where id = ${params.reportId} and status = 'open')`

  const change =
    report.targetType === "profile"
      ? sql`update profile set bio = '', avatar_url = null where user_id = ${report.targetId} and ${stillOpen} returning user_id`
      : sql`delete from posts where id = ${report.targetId} and ${stillOpen} returning id`

  const result = await db.execute(sql`
    with changed as (${change}),
    upd as (
      update reports
         set status = 'content_removed', resolved_at = now(), resolved_by = ${params.adminId}
       where target_type = ${report.targetType} and target_id = ${report.targetId} and status = 'open'
      returning id, target_type, target_id
    )
    insert into admin_actions (id, admin_id, action, report_id, target_type, target_id)
    select gen_random_uuid()::text, ${params.adminId}, 'remove_content', id, target_type, target_id from upd
    returning report_id
  `)
  if (result.rows.length === 0) return null
  return { urls }
}
