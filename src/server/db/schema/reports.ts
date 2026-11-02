import { sql } from "drizzle-orm"
import { check, index, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { user } from "./auth"

/**
 * Reports on content. `target_id` points at a post or reply (posts.id) or, for
 * a profile, at the profile owner's user id. It has no foreign key on purpose:
 * removing the content must not remove the report, because the report is the
 * record of why it was removed.
 */
export const reportTargetType = pgEnum("report_target_type", ["post", "reply", "profile"])
export const reportReason = pgEnum("report_reason", ["spam", "harassment", "inappropriate", "copyright", "other"])
export const reportStatus = pgEnum("report_status", ["open", "dismissed", "content_removed"])

export const reports = pgTable(
  "reports",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    /** Set to null if the reporter deletes their account; the report stays. */
    reporterId: text("reporter_id").references(() => user.id, { onDelete: "set null" }),
    targetType: reportTargetType("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: reportReason("reason").notNull(),
    details: text("details").notNull().default(""),
    status: reportStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    /** The admin's user id. Plain text, no foreign key, so the audit trail outlives any account. */
    resolvedBy: text("resolved_by"),
  },
  (table) => [
    // One report per person per item. Also makes a double tap harmless.
    uniqueIndex("reports_reporter_target_unique").on(table.reporterId, table.targetType, table.targetId),
    // The admin queue: by status, newest first.
    index("reports_status_created_idx").on(table.status, table.createdAt.desc()),
    index("reports_target_idx").on(table.targetType, table.targetId),
    check("reports_details_length", sql`char_length(${table.details}) <= 500`),
  ],
)

export const adminAction = pgEnum("admin_action", ["dismiss_report", "remove_content"])

/**
 * Audit log of admin actions. Who (user id), what, which report and item, and
 * when. Nothing personal: no name, email, username, report text or content.
 * No foreign keys, so rows survive deleted accounts and deleted content.
 */
export const adminActions = pgTable(
  "admin_actions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    adminId: text("admin_id").notNull(),
    action: adminAction("action").notNull(),
    reportId: text("report_id").notNull(),
    targetType: reportTargetType("target_type").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("admin_actions_created_idx").on(table.createdAt.desc())],
)

export type Report = typeof reports.$inferSelect
