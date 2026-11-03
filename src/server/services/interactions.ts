import "server-only"
import { and, asc, count, desc, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/server/db"
import {
  bookmarks,
  follows,
  likes,
  notifications,
  postImages,
  posts,
  profile,
  reposts,
  user,
} from "@/server/db/schema"
import { isBlockedEither, notBlockedWith } from "@/server/services/blocks"
import { attachImages, decodeCursor, encodeCursor, postColumns, type PostView } from "@/server/services/posts"
import {
  ACTIVITY_PAGE_SIZE,
  REPLIES_PAGE_SIZE,
  type ActivityFilter,
} from "@/server/validators/interactions"

/**
 * Likes, bookmarks, reposts, follows, replies (posts with a parent) and notifications.
 *
 * Rules every function here follows:
 *  - The acting user always comes from the session (the caller passes it in).
 *  - Toggles take the state the caller WANTS ("on"), not "flip". Inserting uses
 *    ON CONFLICT DO NOTHING and deleting a missing row deletes nothing, so a
 *    repeated or double-clicked request changes nothing the second time.
 *  - A notification is written only when a row was really inserted, and never
 *    when the actor is the recipient. Undoing the action removes it again, so
 *    like, unlike, like leaves one notification, not two.
 *  - Counts are counted in the database and returned to the client.
 */

export type PostFlag = "like" | "bookmark" | "repost"

const flagTables = { like: likes, bookmark: bookmarks, repost: reposts } as const

export interface PostCounts {
  likeCount: number
  replyCount: number
  repostCount: number
}

export async function getPostCounts(postId: string): Promise<PostCounts> {
  const one = async (table: typeof likes | typeof reposts) => {
    const [row] = await db.select({ n: count() }).from(table).where(eq(table.postId, postId))
    return row?.n ?? 0
  }
  const [likeCount, replyCount, repostCount] = await Promise.all([one(likes), countReplies(postId), one(reposts)])
  return { likeCount, replyCount, repostCount }
}

async function countReplies(postId: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(posts).where(eq(posts.parentId, postId))
  return row?.n ?? 0
}

async function authorOf(postId: string): Promise<string | null> {
  const [row] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId)).limit(1)
  return row?.authorId ?? null
}

export type SetFlagResult = { found: false } | ({ found: true; on: boolean } & PostCounts)

export async function setPostFlag(
  kind: PostFlag,
  userId: string,
  postId: string,
  on: boolean
): Promise<SetFlagResult> {
  const authorId = await authorOf(postId)
  if (!authorId) return { found: false }
  // Blocked either way: the post is "not found". Undoing (on = false) stays allowed.
  if (on && authorId !== userId && (await isBlockedEither(userId, authorId))) return { found: false }

  const table = flagTables[kind] as typeof likes
  const notifyType = kind === "like" ? "like" : kind === "repost" ? "repost" : null

  if (on) {
    const inserted = await db.insert(table).values({ userId, postId }).onConflictDoNothing().returning({ userId: table.userId })
    if (inserted.length > 0 && notifyType && authorId !== userId) {
      await db.insert(notifications).values({ recipientId: authorId, actorId: userId, type: notifyType, postId })
    }
  } else {
    const removed = await db
      .delete(table)
      .where(and(eq(table.userId, userId), eq(table.postId, postId)))
      .returning({ userId: table.userId })
    if (removed.length > 0 && notifyType) {
      await db
        .delete(notifications)
        .where(
          and(eq(notifications.actorId, userId), eq(notifications.postId, postId), eq(notifications.type, notifyType))
        )
    }
  }

  return { found: true, on, ...(await getPostCounts(postId)) }
}

export type SetFollowResult =
  | { found: false }
  | { found: true; self: true }
  | { found: true; self: false; on: boolean; followerCount: number }

export async function setFollow(followerId: string, username: string, on: boolean): Promise<SetFollowResult> {
  const [target] = await db
    .select({ userId: profile.userId })
    .from(profile)
    .where(eq(profile.username, username))
    .limit(1)
  if (!target) return { found: false }
  if (target.userId === followerId) return { found: true, self: true }
  if (on && (await isBlockedEither(followerId, target.userId))) return { found: false }

  if (on) {
    const inserted = await db
      .insert(follows)
      .values({ followerId, followingId: target.userId })
      .onConflictDoNothing()
      .returning({ id: follows.followerId })
    if (inserted.length > 0) {
      await db.insert(notifications).values({ recipientId: target.userId, actorId: followerId, type: "follow" })
    }
  } else {
    const removed = await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, target.userId)))
      .returning({ id: follows.followerId })
    if (removed.length > 0) {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.actorId, followerId),
            eq(notifications.recipientId, target.userId),
            eq(notifications.type, "follow")
          )
        )
    }
  }

  const [row] = await db.select({ n: count() }).from(follows).where(eq(follows.followingId, target.userId))
  return { found: true, self: false, on, followerCount: row?.n ?? 0 }
}

// ---------- Replies ----------

export interface RepliesPage {
  items: PostView[]
  nextCursor: string | null
}

/** The reply (a post with a parent) and its notification are written in one atomic batch. */
export async function createReply(
  userId: string,
  postId: string,
  body: string
): Promise<{ found: false } | { found: true; reply: PostView; replyCount: number }> {
  const authorId = await authorOf(postId)
  if (!authorId) return { found: false }
  if (authorId !== userId && (await isBlockedEither(userId, authorId))) return { found: false }

  const id = crypto.randomUUID()
  const insertReply = db.insert(posts).values({ id, authorId: userId, body, parentId: postId })
  if (authorId !== userId) {
    await db.batch([
      insertReply,
      db.insert(notifications).values({ recipientId: authorId, actorId: userId, type: "comment", postId, replyId: id }),
    ])
  } else {
    await insertReply
  }

  const rows = await db
    .select(postColumns)
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .innerJoin(profile, eq(profile.userId, posts.authorId))
    .where(eq(posts.id, id))
    .limit(1)
  const [reply] = await attachImages(rows, userId)
  if (!reply) throw new Error("reply missing after insert")

  return { found: true, reply, replyCount: await countReplies(postId) }
}

/**
 * Layer 4: the author is part of the WHERE clause. Zero rows means "not found
 * or not yours", and the caller answers both the same way. Only replies can be
 * removed here (parent_id is set), and the notification goes with it
 * (ON DELETE CASCADE on notifications.comment_id).
 */
export async function deleteOwnReply(
  replyId: string,
  userId: string
): Promise<{ deleted: false } | { deleted: true; replyCount: number }> {
  const removed = await db
    .delete(posts)
    .where(and(eq(posts.id, replyId), eq(posts.authorId, userId), isNotNull(posts.parentId)))
    .returning({ parentId: posts.parentId })
  const parentId = removed[0]?.parentId
  if (!parentId) return { deleted: false }
  return { deleted: true, replyCount: await countReplies(parentId) }
}

/** Oldest first, keyset on (created_at, id). */
export async function listReplies(params: {
  postId: string
  cursor: string | null
  viewerId: string | null
}): Promise<RepliesPage> {
  const decoded = params.cursor ? decodeCursor(params.cursor) : null
  const after = decoded
    ? sql`(${posts.createdAt}, ${posts.id}) > (${decoded.createdAt}::timestamp, ${decoded.id})`
    : undefined

  const rows = await db
    .select(postColumns)
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .innerJoin(profile, eq(profile.userId, posts.authorId))
    .where(and(eq(posts.parentId, params.postId), after, notBlockedWith(params.viewerId, posts.authorId)))
    .orderBy(asc(posts.createdAt), asc(posts.id))
    .limit(REPLIES_PAGE_SIZE + 1)

  const hasMore = rows.length > REPLIES_PAGE_SIZE
  const page = hasMore ? rows.slice(0, REPLIES_PAGE_SIZE) : rows
  const last = page.at(-1)

  return {
    items: await attachImages(page, params.viewerId),
    nextCursor: hasMore && last ? encodeCursor(last.createdAtText, last.id) : null,
  }
}

// ---------- Activity ----------

export interface NotificationView {
  id: string
  type: "like" | "repost" | "comment" | "follow"
  createdAt: string
  unread: boolean
  actor: { name: string; username: string; avatarUrl: string | null }
  /** The post the notification is about. Null for follows. */
  post: { id: string; body: string; imageUrl: string | null } | null
  /** The text of the reply, for "replied to your post". */
  replyBody: string | null
}

export interface ActivityPage {
  items: NotificationView[]
  nextCursor: string | null
}

/** The viewer's own notifications, newest first. The recipient is always the viewer. */
const replyPost = alias(posts, "reply_post")

export async function listNotifications(params: {
  viewerId: string
  filter: ActivityFilter
  cursor: string | null
}): Promise<ActivityPage> {
  const decoded = params.cursor ? decodeCursor(params.cursor) : null
  const after = decoded
    ? sql`(${notifications.createdAt}, ${notifications.id}) < (${decoded.createdAt}::timestamp, ${decoded.id})`
    : undefined
  const byType =
    params.filter === "likes"
      ? eq(notifications.type, "like")
      : params.filter === "replies"
        ? eq(notifications.type, "comment")
        : undefined

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      createdAt: notifications.createdAt,
      createdAtText: sql<string>`${notifications.createdAt}::text`,
      readAt: notifications.readAt,
      name: user.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      postId: posts.id,
      postBody: posts.body,
      imageUrl: postImages.url,
      replyBody: replyPost.body,
    })
    .from(notifications)
    .innerJoin(user, eq(user.id, notifications.actorId))
    .innerJoin(profile, eq(profile.userId, notifications.actorId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .leftJoin(postImages, and(eq(postImages.postId, posts.id), eq(postImages.position, 0)))
    .leftJoin(replyPost, eq(replyPost.id, notifications.replyId))
    .where(
      and(
        eq(notifications.recipientId, params.viewerId),
        byType,
        after,
        notBlockedWith(params.viewerId, notifications.actorId)
      )
    )
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(ACTIVITY_PAGE_SIZE + 1)

  const hasMore = rows.length > ACTIVITY_PAGE_SIZE
  const page = hasMore ? rows.slice(0, ACTIVITY_PAGE_SIZE) : rows
  const last = page.at(-1)

  return {
    items: page.map((row) => ({
      id: row.id,
      type: row.type,
      createdAt: row.createdAt.toISOString(),
      unread: row.readAt === null,
      actor: { name: row.name, username: row.username, avatarUrl: row.avatarUrl },
      post: row.postId ? { id: row.postId, body: row.postBody ?? "", imageUrl: row.imageUrl } : null,
      replyBody: row.replyBody,
    })),
    nextCursor: hasMore && last ? encodeCursor(last.createdAtText, last.id) : null,
  }
}

/** How many of the viewer's notifications are still unread (blocked people excluded, like the list). */
export async function countUnreadNotifications(viewerId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientId, viewerId),
        isNull(notifications.readAt),
        notBlockedWith(viewerId, notifications.actorId)
      )
    )
  return row?.n ?? 0
}

/** Marks everything the viewer has not read as read. Only touches the viewer's own rows. */
export async function markNotificationsRead(viewerId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, viewerId), isNull(notifications.readAt)))
}
