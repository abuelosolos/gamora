import { sql } from "drizzle-orm"
import { check, index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"
import { user } from "./auth"

/**
 * Who blocked whom. The composite primary key makes blocking idempotent. The
 * blocked_id index serves "who has blocked me" checks. Rows go away with
 * either account.
 */
export const blocks = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ name: "blocks_blocker_blocked_pk", columns: [table.blockerId, table.blockedId] }),
    index("blocks_blocked_idx").on(table.blockedId),
    check("blocks_not_self", sql`${table.blockerId} <> ${table.blockedId}`),
  ],
)
