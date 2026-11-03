import "server-only"
import { and, arrayOverlaps, asc, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { cacheLife, cacheTag } from "next/cache"
import type { PostPreview } from "@/lib/post-meta"
import { db } from "@/server/db"
import {
  bookmarks,
  follows,
  likes,
  postImages,
  posts,
  profile,
  reposts,
  user,
} from "@/server/db/schema"
import { FEED_PAGE_SIZE, type FeedTab } from "@/server/validators/posts"

const EVENT_KINDS: readonly ProfileEventKind[] = ["post", "reply", "repost", "like"]

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
  replyCount: number
  repostCount: number
  /** What the signed-in viewer has done. All false when signed out. */
  viewer: { liked: boolean; bookmarked: boolean; reposted: boolean; followsAuthor: boolean }
  /** Profile lists only: what the profile's owner did with this post, and when. */
  via?: PostVia
}

export type ProfileEventKind = "post" | "reply" | "repost" | "like"

export interface PostVia {
  kind: ProfileEventKind
  /** When it was done (ISO), not when the post was written. */
  at: string
  /** Replies only: the post that was answered (itself possibly a reply), shown above the reply as a thread. */
  parent?: PostView
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

export const postColumns = {
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

const replies = alias(posts, "replies")

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

  const [likeCounts, repostCounts, replyCounts, liked, bookmarked, reposted, followed] = await Promise.all([
    countFor(likes),
    countFor(reposts),
    // Replies are posts whose parent is this post.
    db
      .select({ postId: sql<string>`${replies.parentId}`, n: count() })
      .from(replies)
      .where(inArray(replies.parentId, ids))
      .groupBy(replies.parentId),
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
    replyCounts: toMap(replyCounts),
    liked,
    bookmarked,
    reposted,
    followed: new Set(followed.map((row) => row.id)),
  }
}

export async function attachImages(rows: PostRow[], viewerId: string | null): Promise<PostView[]> {
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
    replyCount: stats.replyCounts.get(row.id) ?? 0,
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
  /** For you only: show artists who list any of these genres (their onboarding interests or profile categories). */
  genres?: string[]
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
        isNull(posts.parentId),
        after,
        params.tab === "following"
          ? inArray(
              posts.authorId,
              db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, params.viewerId!))
            )
          : undefined,
        params.tab === "for-you" && params.genres && params.genres.length > 0
          ? or(arrayOverlaps(profile.interests, params.genres), arrayOverlaps(profile.categories, params.genres))
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

/** One artist's posts, newest first, same keyset pagination as the feed (posts_author_idx). */
export async function listPostsByUsername(params: {
  username: string
  cursor: string | null
  viewerId: string | null
}): Promise<FeedPage> {
  const decoded = params.cursor ? decodeCursor(params.cursor) : null
  const after = decoded
    ? sql`(${posts.createdAt}, ${posts.id}) < (${decoded.createdAt}::timestamp, ${decoded.id})`
    : undefined

  const rows = await db
    .select(postColumns)
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .innerJoin(profile, eq(profile.userId, posts.authorId))
    .where(and(eq(profile.username, params.username), isNull(posts.parentId), after))
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

/** Profile sections that list what the owner did, each by the time it was done. */
export type ProfileSection = "activity" | "replies" | "likes" | "reposts"

const SECTION_KINDS: Record<ProfileSection, ProfileEventKind[]> = {
  activity: ["post", "reply", "repost", "like"],
  replies: ["reply"],
  likes: ["like"],
  reposts: ["repost"],
}

function encodeEventCursor(at: string, id: string, kind: ProfileEventKind): string {
  return Buffer.from(`${at}|${id}|${kind}`).toString("base64url")
}

function decodeEventCursor(cursor: string): { at: string; id: string; kind: ProfileEventKind } | null {
  const [at, id, kind, extra] = Buffer.from(cursor, "base64url").toString().split("|")
  if (extra !== undefined || !at || !id || !kind) return null
  if (!CURSOR_TIME.test(at) || !UUID.test(id)) return null
  if (!EVENT_KINDS.includes(kind as ProfileEventKind)) return null
  return { at, id, kind: kind as ProfileEventKind }
}

/**
 * What one artist did, newest first by WHEN it was done: their posts and
 * replies (the time written), their reposts and likes (the time pressed). Each
 * section is the same query over fewer kinds. Keyset pagination on
 * (event time, post id, kind), so un-liking something never shifts a page. The
 * username is a bound parameter; the SQL text is fixed.
 */
export async function listProfileEvents(params: {
  username: string
  section: ProfileSection
  cursor: string | null
  viewerId: string | null
}): Promise<FeedPage> {
  const decoded = params.cursor ? decodeEventCursor(params.cursor) : null
  const owner = sql`(select user_id from profile where username = ${params.username})`
  const parts: Record<ProfileEventKind, ReturnType<typeof sql>> = {
    post: sql`select 'post'::text as kind, p.created_at as event_at, p.id as post_id from posts p where p.author_id = ${owner} and p.parent_id is null`,
    reply: sql`select 'reply'::text as kind, p.created_at as event_at, p.id as post_id from posts p where p.author_id = ${owner} and p.parent_id is not null`,
    repost: sql`select 'repost'::text as kind, r.created_at as event_at, r.post_id as post_id from reposts r where r.user_id = ${owner}`,
    like: sql`select 'like'::text as kind, l.created_at as event_at, l.post_id as post_id from likes l where l.user_id = ${owner}`,
  }
  const union = sql.join(
    SECTION_KINDS[params.section].map((kind) => parts[kind]),
    sql` union all `
  )
  const after = decoded
    ? sql`where (e.event_at, e.post_id, e.kind) < (${decoded.at}::timestamp, ${decoded.id}, ${decoded.kind})`
    : sql``

  const result = await db.execute<{ kind: ProfileEventKind; at: string; id: string }>(sql`
    select e.kind, e.event_at::text as at, e.post_id as id
      from (${union}) e
      ${after}
     order by e.event_at desc, e.post_id desc, e.kind desc
     limit ${FEED_PAGE_SIZE + 1}
  `)

  const events = result.rows
  const hasMore = events.length > FEED_PAGE_SIZE
  const pageEvents = hasMore ? events.slice(0, FEED_PAGE_SIZE) : events
  const ids = [...new Set(pageEvents.map((event) => event.id))]
  if (ids.length === 0) return { items: [], nextCursor: null }

  const replyIds = pageEvents.filter((event) => event.kind === "reply").map((event) => event.id)
  const [postRows, parentLinks] = await Promise.all([
    db
      .select(postColumns)
      .from(posts)
      .innerJoin(user, eq(user.id, posts.authorId))
      .innerJoin(profile, eq(profile.userId, posts.authorId))
      .where(inArray(posts.id, ids)),
    replyIds.length === 0
      ? Promise.resolve([] as { id: string; parentId: string | null }[])
      : db.select({ id: posts.id, parentId: posts.parentId }).from(posts).where(inArray(posts.id, replyIds)),
  ])
  // The posts the replies answer, as full posts (counts, locks and the viewer's flags included).
  const parentIds = [...new Set(parentLinks.flatMap((link) => (link.parentId ? [link.parentId] : [])))]
  const parentRows =
    parentIds.length === 0
      ? []
      : await db
          .select(postColumns)
          .from(posts)
          .innerJoin(user, eq(user.id, posts.authorId))
          .innerJoin(profile, eq(profile.userId, posts.authorId))
          .where(inArray(posts.id, parentIds))
  const parentViews = new Map((await attachImages(parentRows, params.viewerId)).map((view) => [view.id, view]))
  const parentOf = new Map(parentLinks.flatMap((link) => (link.parentId ? [[link.id, link.parentId] as const] : [])))
  const byId = new Map(postRows.map((row) => [row.id, row]))
  
  // Keep the event order; an event whose post is gone (deleted meanwhile) is skipped.
  const kept = pageEvents.flatMap((event) => {
    const row = byId.get(event.id)
    return row ? [{ event, row }] : []
  })
  const views = await attachImages(
    kept.map((item) => item.row),
    params.viewerId
  )
  const items = views.map((view, index) => {
    const { event } = kept[index]!
    const via: PostVia = {
      kind: event.kind,
      at: new Date(`${event.at.replace(" ", "T")}Z`).toISOString(),
      ...(event.kind === "reply" && parentViews.has(parentOf.get(event.id) ?? "")
        ? { parent: parentViews.get(parentOf.get(event.id)!) }
        : {}),
    }
    return { ...view, via }
  })

  const last = pageEvents.at(-1)
  return { items, nextCursor: hasMore && last ? encodeEventCursor(last.at, last.id, last.kind) : null }
}

/**
 * What a link preview needs, and nothing else: the creator's public name,
 * username and avatar, the text, and the first picture. No viewer, email or
 * internal ids. Cached for a few minutes because link scrapers can ask often; a
 * deleted post can show in a preview for that long while its page already 404s.
 */
export async function getPostPreview(id: string): Promise<PostPreview | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag(`post-${id}`)

  const [row] = await db
    .select({
      body: posts.body,
      name: user.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
    })
    .from(posts)
    .innerJoin(user, eq(user.id, posts.authorId))
    .innerJoin(profile, eq(profile.userId, posts.authorId))
    .where(eq(posts.id, id))
    .limit(1)
  if (!row) return null

  const [first] = await db
    .select({
      url: postImages.url,
      width: postImages.width,
      height: postImages.height,
      altText: postImages.altText,
    })
    .from(postImages)
    .where(eq(postImages.postId, id))
    .orderBy(asc(postImages.position))
    .limit(1)

  return {
    body: row.body,
    author: { name: row.name, username: row.username, avatarUrl: row.avatarUrl },
    image: first ?? null,
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
