import "server-only"
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/server/db"
import {
  bookmarks,
  comments,
  follows,
  likes,
  postImages,
  posts,
  profile,
  reposts,
  user,
} from "@/server/db/schema"
import { FEED_PAGE_SIZE, type FeedTab } from "@/server/validators/posts"

export interface PostImageView {
  id: string
  url: string
  width: number
  height: number
  altText: string
}

/** What a page may show about a post. No email, no author id, no admin flag. */
export interface PostView {
  id: string
  body: string
  createdAt: string
  author: { name: string; username: string; avatarUrl: string | null }
  images: PostImageView[]
  /** True when the signed-in viewer wrote it. Decided here, never by the client. */
  isOwner: boolean
  /** Counted in the database on every read. Never taken from the client. */
  likeCount: number
  commentCount: number
  repostCount: number
  /** What the signed-in viewer has done. All false when signed out. */
  viewer: { liked: boolean; bookmarked: boolean; reposted: boolean; followsAuthor: boolean }
}

export interface FeedPage {
  items: PostView[]
  nextCursor: string | null
}

const CURSOR_TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString("base64url")
}

export function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  const [createdAt, id, extra] = Buffer.from(cursor, "base64url").toString().split("|")
  if (extra !== undefined || !createdAt || !id) return null
  if (!CURSOR_TIME.test(createdAt) || !UUID.test(id)) return null
  return { createdAt, id }
}

const postColumns = {
  id: posts.id,
  body: posts.body,
  createdAt: posts.createdAt,
  // Full precision, used only to build the next cursor.
  createdAtText: sql<string>`${posts.createdAt}::text`,
  authorId: posts.authorId,
  authorName: user.name,
  authorUsername: profile.username,
  authorAvatarUrl: profile.avatarUrl,
}

type PostRow = {
  id: string
  body: string
  createdAt: Date
  authorId: string
  authorName: string
  authorUsername: string
  authorAvatarUrl: string | null
}

type CountRow = { postId: string; n: number }

function toMap(rows: CountRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.postId, row.n]))
}

/** Counts per post and the viewer's own flags, for one page of posts. */
async function loadStats(rows: PostRow[], viewerId: string | null) {
  const ids = rows.map((row) => row.id)
  const authorIds = [...new Set(rows.map((row) => row.authorId))]
  const countFor = (table: typeof likes | typeof reposts): Promise<CountRow[]> =>
    db
      .select({ postId: table.postId, n: count() })
      .from(table)
      .where(inArray(table.postId, ids))
      .groupBy(table.postId)
  const mineFor = async (table: typeof likes | typeof bookmarks | typeof reposts): Promise<Set<string>> => {
    if (!viewerId) return new Set()
    const mine = await db
      .select({ postId: table.postId })
      .from(table)
      .where(and(eq(table.userId, viewerId), inArray(table.postId, ids)))
    return new Set(mine.map((row) => row.postId))
  }

  const [likeCounts, repostCounts, commentCounts, liked, bookmarked, reposted, followed] = await Promise.all([
    countFor(likes),
    countFor(reposts),
    db
      .select({ postId: comments.postId, n: count() })
      .from(comments)
      .where(inArray(comments.postId, ids))
      .groupBy(comments.postId),
    mineFor(likes),
    mineFor(bookmarks),
    mineFor(reposts),
    viewerId
      ? db
          .select({ id: follows.followingId })
          .from(follows)
          .where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, authorIds)))
      : Promise.resolve([] as { id: string }[]),
  ])

  return {
    likeCounts: toMap(likeCounts),
    repostCounts: toMap(repostCounts),
    commentCounts: toMap(commentCounts),
    liked,
    bookmarked,
    reposted,
    followed: new Set(followed.map((row) => row.id)),
  }
}

async function attachImages(rows: PostRow[], viewerId: string | null): Promise<PostView[]> {
  if (rows.length === 0) return []
  const [images, stats] = await Promise.all([
    db
      .select({
        id: postImages.id,
        postId: postImages.postId,
        url: postImages.url,
        width: postImages.width,
        height: postImages.height,
        altText: postImages.altText,
      })
      .from(postImages)
      .where(
        inArray(
          postImages.postId,
          rows.map((row) => row.id)
        )
      )
      .orderBy(asc(postImages.position)),
    loadStats(rows, viewerId),
  ])

  const byPost = new Map<string, PostImageView[]>()
  for (const { postId, ...image } of images) {
    const list = byPost.get(postId) ?? []
    list.push(image)
    byPost.set(postId, list)
  }

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    author: { name: row.authorName, username: row.authorUsername, avatarUrl: row.authorAvatarUrl },
    images: byPost.get(row.id) ?? [],
    isOwner: viewerId !== null && viewerId === row.authorId,
    likeCount: stats.likeCounts.get(row.id) ?? 0,
    commentCount: stats.commentCounts.get(row.id) ?? 0,
    repostCount: stats.repostCounts.get(row.id) ?? 0,
    viewer: {
      liked: stats.liked.has(row.id),
      bookmarked: stats.bookmarked.has(row.id),
      reposted: stats.reposted.has(row.id),
      followsAuthor: stats.followed.has(row.authorId),
    },
  }))
}

/**
 * One page of the feed, newest first. Keyset pagination on (created_at, id),
 * which the posts_created_at_idx index serves. A bad cursor starts from the top.
 *
 * "following" shows posts by people the viewer follows. Signed out, there is
 * nobody to follow, so it is empty rather than quietly showing everyone.
 */
export async function listFeed(params: {
  tab: FeedTab
  cursor: string | null
  viewerId: string | null
}): Promise<FeedPage> {
  if (params.tab === "following" && !params.viewerId) return { items: [], nextCursor: null }

  const decoded = params.cursor ? decodeCursor(params.cursor) : null
  const after = decoded
    ? sql`(${posts.createdAt}, ${posts.id}) < (${decoded.createdAt}::timestamp, ${decoded.id})`
    : undefined

  const rows = await db
    .select(postColumns)
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .innerJoin(profile, eq(profile.userId, posts.authorId))
    .where(
      and(
        after,
        params.tab === "following"
          ? inArray(
              posts.authorId,
              db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, params.viewerId!))
            )
          : undefined
      )
    )
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(FEED_PAGE_SIZE + 1)

  const hasMore = rows.length > FEED_PAGE_SIZE
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows
  const last = page.at(-1)

  return {
    items: await attachImages(page, params.viewerId),
    nextCursor: hasMore && last ? encodeCursor(last.createdAtText, last.id) : null,
  }
}

export async function getPostById(id: string, viewerId: string | null): Promise<PostView | null> {
  const rows = await db
    .select(postColumns)
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .innerJoin(profile, eq(profile.userId, posts.authorId))
    .where(eq(posts.id, id))
    .limit(1)
  return (await attachImages(rows, viewerId))[0] ?? null
}

/**
 * Creates the post and its images in one atomic batch. `authorId` comes from
 * the session, never from client input.
 */
export async function createPostWithImages(
  authorId: string,
  body: string,
  images: { url: string; width: number; height: number; altText: string }[]
): Promise<string> {
  const id = crypto.randomUUID()
  const insertPost = db.insert(posts).values({ id, authorId, body })
  if (images.length === 0) {
    await insertPost
  } else {
    await db.batch([
      insertPost,
      db.insert(postImages).values(images.map((image, position) => ({ ...image, postId: id, position }))),
    ])
  }
  return id
}

/**
 * Layer 4: the author is part of the WHERE clause. Zero rows means "not found
 * or not yours", and the caller answers both the same way. Returns the image
 * URLs so the files can be removed from Blob after the rows are gone.
 */
export async function deleteOwnPost(
  postId: string,
  authorId: string
): Promise<{ deleted: boolean; urls: string[] }> {
  const images = await db
    .select({ url: postImages.url })
    .from(postImages)
    .innerJoin(posts, eq(posts.id, postImages.postId))
    .where(and(eq(postImages.postId, postId), eq(posts.authorId, authorId)))

  const removed = await db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.authorId, authorId)))
    .returning({ id: posts.id })

  return removed.length > 0
    ? { deleted: true, urls: images.map((image) => image.url) }
    : { deleted: false, urls: [] }
}

/**
 * The viewer's saved posts, most recently saved first. The cursor is the
 * bookmark's own (created_at, post id), so un-saving a post never shifts pages.
 */
export async function listBookmarkedPosts(params: { viewerId: string; cursor: string | null }): Promise<FeedPage> {
  const decoded = params.cursor ? decodeCursor(params.cursor) : null
  const after = decoded
    ? sql`(${bookmarks.createdAt}, ${bookmarks.postId}) < (${decoded.createdAt}::timestamp, ${decoded.id})`
    : undefined

  const rows = await db
    .select({ ...postColumns, savedAtText: sql<string>`${bookmarks.createdAt}::text` })
    .from(bookmarks)
    .innerJoin(posts, eq(posts.id, bookmarks.postId))
    .innerJoin(user, eq(user.id, posts.authorId))
    .innerJoin(profile, eq(profile.userId, posts.authorId))
    .where(and(eq(bookmarks.userId, params.viewerId), after))
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.postId))
    .limit(FEED_PAGE_SIZE + 1)

  const hasMore = rows.length > FEED_PAGE_SIZE
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows
  const last = page.at(-1)

  return {
    items: await attachImages(page, params.viewerId),
    nextCursor: hasMore && last ? encodeCursor(last.savedAtText, last.id) : null,
  }
}
