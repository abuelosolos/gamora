import "server-only"
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/server/db"
import {
  bookmarks,
  comments,
  follows,
  likes,
  notifications,
  postImages,
  posts,
  profile,
  reposts,
  user,
} from "@/server/db/schema"
import { decodeCursor, encodeCursor } from "@/server/services/posts"
import {
  ACTIVITY_PAGE_SIZE,
  COMMENTS_PAGE_SIZE,
  type ActivityFilter,
} from "@/server/validators/interactions"

/**
 * Likes, bookmarks, reposts, follows, comments and notifications.
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
  commentCount: number
  repostCount: number
}

export async function getPostCounts(postId: string): Promise<PostCounts> {
  const one = async (table: typeof likes | typeof reposts | typeof comments) => {
    const [row] = await db.select({ n: count() }).from(table).where(eq(table.postId, postId))
    return row?.n ?? 0
  }
  const [likeCount, commentCount, repostCount] = await Promise.all([one(likes), one(comments), one(reposts)])
  return { likeCount, commentCount, repostCount }
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

// ---------- Comments ----------

export interface CommentView {
  id: string
  body: string
  createdAt: string
  author: { name: string; username: string; avatarUrl: string | null }
  /** True when the signed-in viewer wrote it. Decided here, never by the client. */
  isOwner: boolean
  /** Whether the viewer follows the comment's author (drives the menu label). */
  followsAuthor: boolean
}

export interface CommentsPage {
  items: CommentView[]
  nextCursor: string | null
}

/** The comment and its notification are written in one atomic batch. */
export async function createComment(
  userId: string,
  postId: string,
  body: string
): Promise<{ found: false } | { found: true; comment: CommentView; commentCount: number }> {
  const authorId = await authorOf(postId)
  if (!authorId) return { found: false }

  const id = crypto.randomUUID()
  const insertComment = db.insert(comments).values({ id, postId, authorId: userId, body })
  if (authorId !== userId) {
    await db.batch([
      insertComment,
      db.insert(notifications).values({ recipientId: authorId, actorId: userId, type: "comment", postId, commentId: id }),
    ])
  } else {
    await insertComment
  }

  const [row] = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      name: user.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
    })
    .from(comments)
    .innerJoin(user, eq(user.id, comments.authorId))
    .innerJoin(profile, eq(profile.userId, comments.authorId))
    .where(eq(comments.id, id))
    .limit(1)
  if (!row) throw new Error("comment missing after insert")

  const [total] = await db.select({ n: count() }).from(comments).where(eq(comments.postId, postId))
  return {
    found: true,
    comment: {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: { name: row.name, username: row.username, avatarUrl: row.avatarUrl },
      isOwner: true,
      followsAuthor: false,
    },
    commentCount: total?.n ?? 0,
  }
}

/**
 * Layer 4: the author is part of the WHERE clause. Zero rows means "not found
 * or not yours", and the caller answers both the same way. The comment's
 * notification goes with it (ON DELETE CASCADE on notifications.comment_id).
 */
export async function deleteOwnComment(
  commentId: string,
  userId: string
): Promise<{ deleted: false } | { deleted: true; commentCount: number }> {
  const removed = await db
    .delete(comments)
    .where(and(eq(comments.id, commentId), eq(comments.authorId, userId)))
    .returning({ postId: comments.postId })
  const postId = removed[0]?.postId
  if (!postId) return { deleted: false }
  const [total] = await db.select({ n: count() }).from(comments).where(eq(comments.postId, postId))
  return { deleted: true, commentCount: total?.n ?? 0 }
}

/** Oldest first, keyset on (created_at, id). */
export async function listComments(params: {
  postId: string
  cursor: string | null
  viewerId: string | null
}): Promise<CommentsPage> {
  const decoded = params.cursor ? decodeCursor(params.cursor) : null
  const after = decoded
    ? sql`(${comments.createdAt}, ${comments.id}) > (${decoded.createdAt}::timestamp, ${decoded.id})`
    : undefined

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      createdAtText: sql<string>`${comments.createdAt}::text`,
      authorId: comments.authorId,
      name: user.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
    })
    .from(comments)
    .innerJoin(user, eq(user.id, comments.authorId))
    .innerJoin(profile, eq(profile.userId, comments.authorId))
    .where(and(eq(comments.postId, params.postId), after))
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .limit(COMMENTS_PAGE_SIZE + 1)

  const hasMore = rows.length > COMMENTS_PAGE_SIZE
  const page = hasMore ? rows.slice(0, COMMENTS_PAGE_SIZE) : rows
  const last = page.at(-1)

  const followed = new Set<string>()
  if (params.viewerId && page.length > 0) {
    const mine = await db
      .select({ id: follows.followingId })
      .from(follows)
      .where(and(eq(follows.followerId, params.viewerId), inArray(follows.followingId, [...new Set(page.map((row) => row.authorId))])))
    for (const row of mine) followed.add(row.id)
  }

  return {
    items: page.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: { name: row.name, username: row.username, avatarUrl: row.avatarUrl },
      isOwner: params.viewerId !== null && params.viewerId === row.authorId,
      followsAuthor: followed.has(row.authorId),
    })),
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
  /** The text of the comment, for "commented on your post". */
  commentBody: string | null
}

export interface ActivityPage {
  items: NotificationView[]
  nextCursor: string | null
}

/** The viewer's own notifications, newest first. The recipient is always the viewer. */
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
      commentBody: comments.body,
    })
    .from(notifications)
    .innerJoin(user, eq(user.id, notifications.actorId))
    .innerJoin(profile, eq(profile.userId, notifications.actorId))
    .leftJoin(posts, eq(posts.id, notifications.postId))
    .leftJoin(postImages, and(eq(postImages.postId, posts.id), eq(postImages.position, 0)))
    .leftJoin(comments, eq(comments.id, notifications.commentId))
    .where(and(eq(notifications.recipientId, params.viewerId), byType, after))
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
      commentBody: row.commentBody,
    })),
    nextCursor: hasMore && last ? encodeCursor(last.createdAtText, last.id) : null,
  }
}
