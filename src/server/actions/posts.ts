"use server"

import { revalidatePath } from "next/cache"
import { requireUserForAction, getUser } from "@/server/auth/session"
import { clientIp, withinRateLimits } from "@/server/security/rate-limit"
import { isOwnPostImageUrl } from "@/server/storage/blob-urls"
import { deleteImages } from "@/server/storage/process-image"
import {
  createPostWithImages,
  deleteOwnPost,
  getNewerFeedPosts,
  listFeed,
  listPostsByUsername,
  listProfileEvents,
  type FeedPage,
  type NewerFeedPosts,
} from "@/server/services/posts"
import {
  createPostSchema,
  feedCursorSchema,
  feedGenresSchema,
  feedTabSchema,
  postIdSchema,
  profileTabSchema,
} from "@/server/validators/posts"
import { usernameSchema } from "@/server/validators/profile"

export type CreatePostResult =
  | { ok: true; id: string }
  | { ok: false; error: "unauthorized" | "rate_limited" | "invalid" | "server"; message: string }

/**
 * The files for a post are uploaded first (/api/upload) and attached here. If
 * the post does not get created for ANY reason, the files this request carried
 * are deleted, so a failed post leaves nothing behind. The client keeps the
 * originals and uploads again on retry.
 */
async function ownUrlsIn(input: unknown, userId: string): Promise<string[]> {
  if (typeof input !== "object" || input === null || !("images" in input)) return []
  const images = (input as { images: unknown }).images
  if (!Array.isArray(images)) return []
  const urls = images.map((image) =>
    typeof image === "object" && image !== null && "url" in image ? (image as { url: unknown }).url : null
  )
  return urls.filter((url): url is string => isOwnPostImageUrl(url, userId))
}

export async function createPostAction(input: unknown): Promise<CreatePostResult> {
  // 1. Validate.
  const parsed = createPostSchema.safeParse(input)

  // 2. Session. Without one we cannot tell which files are the caller's, so none are deleted.
  const session = await requireUserForAction()
  if (!session.ok) {
    return { ok: false, error: "unauthorized", message: "Sign in to post." }
  }
  const { user } = session

  const cleanup = (extra: string[] = []) => ownUrlsIn(input, user.id).then((urls) => deleteImages([...new Set([...urls, ...extra])]))

  if (!parsed.success) {
    await cleanup()
    return {
      ok: false,
      error: "invalid",
      message: parsed.error.issues[0]?.message ?? "Check your post and try again.",
    }
  }
  const { body, images } = parsed.data

  // 3. Ownership: every image must be one this user uploaded.
  if (!images.every((image) => isOwnPostImageUrl(image.url, user.id))) {
    await cleanup()
    return { ok: false, error: "invalid", message: "One of the images could not be used." }
  }

  // 4. Rate limit.
  const allowed = await withinRateLimits([
    { name: "post:user", key: user.id, limit: 10, windowSeconds: 60 * 60 },
  ])
  if (!allowed) {
    await cleanup()
    return { ok: false, error: "rate_limited", message: "You are posting a lot. Try again in a little while." }
  }

  // 5. Write. The author is the session user.
  try {
    const id = await createPostWithImages(user.id, body, images)
    // Drop the cached feed and profile views so the next visit shows the new post.
    revalidatePath("/feed")
    revalidatePath("/u/[username]", "page")
    return { ok: true, id }
  } catch (error) {
    console.error("[createPost] failed", error instanceof Error ? error.message : "unknown")
    await cleanup()
    return { ok: false, error: "server", message: "Something went wrong. Try again." }
  }
}

export type DeletePostResult =
  | { ok: true }
  | { ok: false; error: "unauthorized" | "rate_limited" | "not_found" | "server"; message: string }

export async function deletePostAction(postId: unknown): Promise<DeletePostResult> {
  const parsed = postIdSchema.safeParse(postId)
  if (!parsed.success) return { ok: false, error: "not_found", message: "Post not found." }

  const session = await requireUserForAction()
  if (!session.ok) return { ok: false, error: "unauthorized", message: "Sign in to continue." }

  const allowed = await withinRateLimits([
    { name: "post-delete:user", key: session.user.id, limit: 30, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { ok: false, error: "rate_limited", message: "Slow down and try again soon." }

  try {
    // Ownership is inside the query. "Not found" and "not yours" look the same.
    const result = await deleteOwnPost(parsed.data, session.user.id)
    if (!result.deleted) return { ok: false, error: "not_found", message: "Post not found." }
    await deleteImages(result.urls)
    return { ok: true }
  } catch (error) {
    console.error("[deletePost] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Something went wrong. Try again." }
  }
}

export type LoadFeedResult =
  | { ok: true; page: FeedPage }
  | { ok: false; error: "rate_limited" | "invalid" | "server"; message: string }

/** "Load more" for the feed. Public data, so signed-out visitors are limited by IP. */
export async function loadFeedPageAction(tab: unknown, cursor: unknown, genres?: unknown): Promise<LoadFeedResult> {
  const parsedTab = feedTabSchema.safeParse(tab)
  const parsedCursor = feedCursorSchema.safeParse(cursor ?? null)
  const parsedGenres = feedGenresSchema.safeParse(genres ?? [])
  if (!parsedTab.success || !parsedCursor.success || !parsedGenres.success) {
    return { ok: false, error: "invalid", message: "Could not load more posts." }
  }

  const viewer = await getUser()
  const allowed = await withinRateLimits([
    { name: "feed:read", key: viewer?.id ?? (await clientIp()), limit: 120, windowSeconds: 10 * 60 },
  ])
  if (!allowed) return { ok: false, error: "rate_limited", message: "Slow down and try again soon." }

  try {
    const page = await listFeed({
      tab: parsedTab.data,
      genres: parsedGenres.data,
      cursor: parsedCursor.data,
      viewerId: viewer?.id ?? null,
    })
    return { ok: true, page }
  } catch (error) {
    console.error("[loadFeed] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Could not load more posts." }
  }
}

/** "Load more" on a profile. Public data, so signed-out visitors are limited by IP. */
export async function loadProfilePostsAction(
  username: unknown,
  cursor: unknown,
  tab: unknown = "posts"
): Promise<LoadFeedResult> {
  const parsedName = usernameSchema.safeParse(username)
  const parsedCursor = feedCursorSchema.safeParse(cursor ?? null)
  const parsedTab = profileTabSchema.safeParse(tab)
  if (!parsedName.success || !parsedCursor.success || !parsedTab.success || parsedTab.data === "subscribed") {
    return { ok: false, error: "invalid", message: "Could not load more posts." }
  }

  const viewer = await getUser()
  const allowed = await withinRateLimits([
    { name: "profile-posts:read", key: viewer?.id ?? (await clientIp()), limit: 120, windowSeconds: 10 * 60 },
  ])
  if (!allowed) return { ok: false, error: "rate_limited", message: "Slow down and try again soon." }

  try {
    const base = { username: parsedName.data, cursor: parsedCursor.data, viewerId: viewer?.id ?? null }
    const page =
      parsedTab.data === "posts"
        ? await listPostsByUsername(base)
        : await listProfileEvents({ ...base, section: parsedTab.data })
    return { ok: true, page }
  } catch (error) {
    console.error("[loadProfilePosts] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false, error: "server", message: "Could not load more posts." }
  }
}

export type NewPostsResult = { ok: true; found: NewerFeedPosts } | { ok: false }

/** "Are there new posts?" for the feed pill. Public data; limited by user, or by IP when signed out. */
export async function checkNewPostsAction(tab: unknown, genres: unknown, topPostId: unknown): Promise<NewPostsResult> {
  const parsedTab = feedTabSchema.safeParse(tab)
  const parsedGenres = feedGenresSchema.safeParse(genres ?? [])
  const parsedTop = postIdSchema.nullable().safeParse(topPostId ?? null)
  if (!parsedTab.success || !parsedGenres.success || !parsedTop.success) return { ok: false }

  const viewer = await getUser()
  const allowed = await withinRateLimits([
    { name: "feed:new", key: viewer?.id ?? (await clientIp()), limit: 40, windowSeconds: 10 * 60 },
  ])
  if (!allowed) return { ok: false }

  try {
    const found = await getNewerFeedPosts({
      tab: parsedTab.data,
      genres: parsedGenres.data,
      viewerId: viewer?.id ?? null,
      topPostId: parsedTop.data,
    })
    return { ok: true, found }
  } catch (error) {
    console.error("[checkNewPosts] failed", error instanceof Error ? error.message : "unknown")
    return { ok: false }
  }
}
