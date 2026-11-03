import "server-only"
import { and, desc, eq, inArray, or, sql, type SQL, type AnyColumn } from "drizzle-orm"
import { db } from "@/server/db"
import { blocks, follows, notifications, profile, user } from "@/server/db/schema"

/**
 * Blocking is hidden both ways: if either person blocked the other, neither
 * sees the other's content, and the interaction actions refuse.
 */

/**
 * A WHERE fragment that is true when `otherUserCol` is NOT blocked with the
 * viewer in either direction. Signed out (no viewer) there is nothing to hide.
 * Values are bound parameters; the column is a Drizzle column, never a string.
 */
export function notBlockedWith(viewerId: string | null, otherUserCol: AnyColumn | SQL): SQL | undefined {
  if (!viewerId) return undefined
  return sql`NOT EXISTS (
    SELECT 1 FROM ${blocks}
    WHERE (${blocks.blockerId} = ${viewerId} AND ${blocks.blockedId} = ${otherUserCol})
       OR (${blocks.blockedId} = ${viewerId} AND ${blocks.blockerId} = ${otherUserCol})
  )`
}

/** True when either person has blocked the other. */
export async function isBlockedEither(a: string, b: string): Promise<boolean> {
  const rows = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
        and(eq(blocks.blockerId, b), eq(blocks.blockedId, a))
      )
    )
    .limit(1)
  return rows.length > 0
}

export interface BlockedUserView {
  username: string
  name: string
  avatarUrl: string | null
  blockedAt: string
}

/** The people this user blocked, most recent first. */
export async function listBlockedUsers(userId: string): Promise<BlockedUserView[]> {
  const rows = await db
    .select({
      username: profile.username,
      name: user.name,
      avatarUrl: profile.avatarUrl,
      blockedAt: blocks.createdAt,
    })
    .from(blocks)
    .innerJoin(user, eq(user.id, blocks.blockedId))
    .innerJoin(profile, eq(profile.userId, blocks.blockedId))
    .where(eq(blocks.blockerId, userId))
    .orderBy(desc(blocks.createdAt), desc(blocks.blockedId))
    .limit(500)
  return rows.map((row) => ({ ...row, blockedAt: row.blockedAt.toISOString() }))
}

export type BlockOutcome = "blocked" | "not_found" | "self"

/**
 * Blocks by username. Also removes follows in both directions and the
 * notifications between the two, in one atomic batch. Repeating is harmless.
 */
export async function blockUser(blockerId: string, username: string): Promise<BlockOutcome> {
  const [target] = await db
    .select({ userId: profile.userId })
    .from(profile)
    .where(eq(profile.username, username))
    .limit(1)
  if (!target) return "not_found"
  if (target.userId === blockerId) return "self"
  const blockedId = target.userId

  await db.batch([
    db.insert(blocks).values({ blockerId, blockedId }).onConflictDoNothing(),
    db
      .delete(follows)
      .where(
        or(
          and(eq(follows.followerId, blockerId), eq(follows.followingId, blockedId)),
          and(eq(follows.followerId, blockedId), eq(follows.followingId, blockerId))
        )
      ),
    db
      .delete(notifications)
      .where(
        or(
          and(eq(notifications.recipientId, blockerId), eq(notifications.actorId, blockedId)),
          and(eq(notifications.recipientId, blockedId), eq(notifications.actorId, blockerId))
        )
      ),
  ])
  return "blocked"
}

/** Removes only this user's own blocks. Returns how many were removed. Follows are not restored. */
export async function unblockUsers(blockerId: string, usernames: string[]): Promise<number> {
  const targets = await db
    .select({ userId: profile.userId })
    .from(profile)
    .where(inArray(profile.username, usernames))
  if (targets.length === 0) return 0
  const removed = await db
    .delete(blocks)
    .where(
      and(
        eq(blocks.blockerId, blockerId),
        inArray(
          blocks.blockedId,
          targets.map((t) => t.userId)
        )
      )
    )
    .returning({ id: blocks.blockedId })
  return removed.length
}
