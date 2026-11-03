import { sql } from "drizzle-orm"
import { check, index, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { user } from "./auth"

/**
 * A person's own Recent searches: text they searched ("query") and profiles
 * they opened from the results ("profile"). Private to the owner: only ever
 * read or written with the session user's id.
 *
 * `key` is what makes a repeat a bump instead of a duplicate: the lowercased
 * term, or the profile owner's user id. Both foreign keys cascade, so deleting
 * an account removes its history and everyone else's "recent" entry for it.
 */
export const searchHistoryKind = pgEnum("search_history_kind", ["query", "profile"])

export const searchHistory = pgTable(
  "search_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: searchHistoryKind("kind").notNull(),
    key: text("key").notNull(),
    /** The text as typed, for kind "query". */
    term: text("term"),
    /** The profile owner, for kind "profile". */
    profileUserId: text("profile_user_id").references(() => user.id, { onDelete: "cascade" }),
    /** Bumped each time the same entry is used again. */
    usedAt: timestamp("used_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("search_history_user_kind_key_unique").on(table.userId, table.kind, table.key),
    index("search_history_user_used_idx").on(table.userId, table.usedAt.desc()),
    check(
      "search_history_shape",
      sql`(${table.kind} = 'query' and ${table.term} is not null and ${table.profileUserId} is null and char_length(${table.term}) <= 40)
        or (${table.kind} = 'profile' and ${table.profileUserId} is not null and ${table.term} is null)`,
    ),
  ],
)
