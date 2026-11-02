import "server-only"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { postImages, posts, profile, user } from "@/server/db/schema"
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
}

export interface FeedPage {
  items: PostView[]
  nextCursor: string | null
}

const CURSOR_TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString("base64url")
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
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

async function attachImages(rows: PostRow[], viewerId: string | null): Promise<PostView[]> {
  if (rows.length === 0) return []
  const images = await db
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
    .orderBy(asc(postImages.position))

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
  }))
}

/**
 * One page of the feed, newest first. Keyset pagination on (created_at, id),
 * which the posts_created_at_idx index serves. A bad cursor starts from the top.
 *
 * "following" has no data yet: the follows table arrives in Phase 5, so it is
 * empty on purpose rather than quietly showing everyone's posts.
 */
export async function listFeed(params: {
  tab: FeedTab
  cursor: string | null
  viewerId: string | null
}): Promise<FeedPage> {
  if (params.tab === "following") return { items: [], nextCursor: null }

  const decoded = params.cursor ? decodeCursor(params.cursor) : null
  const after = decoded
    ? sql`(${posts.createdAt}, ${posts.id}) < (${decoded.createdAt}::timestamp, ${decoded.id})`
    : undefined

  const rows = await db
    .select(postColumns)
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .innerJoin(profile, eq(profile.userId, posts.authorId))
    .where(after)
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
