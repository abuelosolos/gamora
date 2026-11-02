"use server"

import { getUser, requireUserForAction } from "@/server/auth/session"
import { clientIp, withinRateLimits } from "@/server/security/rate-limit"
import {
  createComment,
  deleteOwnComment,
  listComments,
  listNotifications,
  setFollow,
  setPostFlag,
  type ActivityPage,
  type CommentView,
  type CommentsPage,
  type PostCounts,
  type PostFlag,
} from "@/server/services/interactions"
import { listBookmarkedPosts, type FeedPage } from "@/server/services/posts"
import {
  activityFilterSchema,
  commentIdSchema,
  createCommentSchema,
  pageCursorSchema,
  setFollowSchema,
  setPostFlagSchema,
} from "@/server/validators/interactions"
import { postIdSchema } from "@/server/validators/posts"

type Failure<E extends string = never> = {
  ok: false
  error: "unauthorized" | "rate_limited" | "invalid" | "not_found" | "server" | E
  message: string
}

const UNAUTHORIZED = (message: string): Failure => ({ ok: false, error: "unauthorized", message })
const RATE_LIMITED: Failure = { ok: false, error: "rate_limited", message: "Slow down and try again soon." }
const SERVER_ERROR: Failure = { ok: false, error: "server", message: "Something went wrong. Try again." }
const NOT_FOUND = (message: string): Failure => ({ ok: false, error: "not_found", message })

function logFailure(name: string, error: unknown) {
  console.error(`[${name}] failed`, error instanceof Error ? error.message : "unknown")
}

// ---------- Like, bookmark, repost ----------

export type SetFlagActionResult = ({ ok: true; on: boolean } & PostCounts) | Failure

/**
 * Shared pipeline: validate, session, rate limit, write. "on" is the state the
 * caller wants, so pressing twice or retrying a request is harmless. The
 * counts in the answer come from the database.
 */
async function setFlag(kind: PostFlag, input: unknown): Promise<SetFlagActionResult> {
  const parsed = setPostFlagSchema.safeParse(input)
  if (!parsed.success) return NOT_FOUND("Post not found.")

  const session = await requireUserForAction()
  if (!session.ok) {
    const verb = kind === "like" ? "like posts" : kind === "bookmark" ? "save posts" : "repost"
    return UNAUTHORIZED(`Sign in to ${verb}.`)
  }

  const allowed = await withinRateLimits([
    { name: `${kind}:user`, key: session.user.id, limit: 120, windowSeconds: 10 * 60 },
  ])
  if (!allowed) return RATE_LIMITED

  try {
    const result = await setPostFlag(kind, session.user.id, parsed.data.postId, parsed.data.on)
    if (!result.found) return NOT_FOUND("That post is no longer available.")
    return {
      ok: true,
      on: result.on,
      likeCount: result.likeCount,
      commentCount: result.commentCount,
      repostCount: result.repostCount,
    }
  } catch (error) {
    logFailure(`${kind}`, error)
    return SERVER_ERROR
  }
}

export async function setLikeAction(input: unknown) {
  return setFlag("like", input)
}

export async function setBookmarkAction(input: unknown) {
  return setFlag("bookmark", input)
}

export async function setRepostAction(input: unknown) {
  return setFlag("repost", input)
}

// ---------- Follow ----------

export type SetFollowActionResult = { ok: true; on: boolean; followerCount: number } | Failure

export async function setFollowAction(input: unknown): Promise<SetFollowActionResult> {
  const parsed = setFollowSchema.safeParse(input)
  if (!parsed.success) return NOT_FOUND("Profile not found.")

  const session = await requireUserForAction()
  if (!session.ok) return UNAUTHORIZED("Sign in to follow people.")

  const allowed = await withinRateLimits([
    { name: "follow:user", key: session.user.id, limit: 60, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return RATE_LIMITED

  try {
    const result = await setFollow(session.user.id, parsed.data.username, parsed.data.on)
    if (!result.found) return NOT_FOUND("Profile not found.")
    if (result.self) return { ok: false, error: "invalid", message: "You cannot follow yourself." }
    return { ok: true, on: result.on, followerCount: result.followerCount }
  } catch (error) {
    logFailure("follow", error)
    return SERVER_ERROR
  }
}

// ---------- Comments ----------

export type CreateCommentResult = { ok: true; comment: CommentView; commentCount: number } | Failure

export async function createCommentAction(input: unknown): Promise<CreateCommentResult> {
  // 1. Validate.
  const parsed = createCommentSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: "invalid", message: parsed.error.issues[0]?.message ?? "Check your comment." }
  }

  // 2. Session.
  const session = await requireUserForAction()
  if (!session.ok) return UNAUTHORIZED("Sign in to comment.")

  // 3. Rate limit. A burst limit and an hourly limit.
  const allowed = await withinRateLimits([
    { name: "comment:burst", key: session.user.id, limit: 5, windowSeconds: 60 },
    { name: "comment:hour", key: session.user.id, limit: 60, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return { ...RATE_LIMITED, message: "You are commenting a lot. Try again in a little while." }

  // 4. Write. The author is the session user.
  try {
    const result = await createComment(session.user.id, parsed.data.postId, parsed.data.body)
    if (!result.found) return NOT_FOUND("That post is no longer available.")
    return { ok: true, comment: result.comment, commentCount: result.commentCount }
  } catch (error) {
    logFailure("createComment", error)
    return SERVER_ERROR
  }
}

export type DeleteCommentResult = { ok: true; commentCount: number } | Failure

export async function deleteCommentAction(commentId: unknown): Promise<DeleteCommentResult> {
  const parsed = commentIdSchema.safeParse(commentId)
  if (!parsed.success) return NOT_FOUND("Comment not found.")

  const session = await requireUserForAction()
  if (!session.ok) return UNAUTHORIZED("Sign in to continue.")

  const allowed = await withinRateLimits([
    { name: "comment-delete:user", key: session.user.id, limit: 60, windowSeconds: 60 * 60 },
  ])
  if (!allowed) return RATE_LIMITED

  try {
    // Ownership is inside the query. "Not found" and "not yours" look the same.
    const result = await deleteOwnComment(parsed.data, session.user.id)
    if (!result.deleted) return NOT_FOUND("Comment not found.")
    return { ok: true, commentCount: result.commentCount }
  } catch (error) {
    logFailure("deleteComment", error)
    return SERVER_ERROR
  }
}

export type LoadCommentsResult = { ok: true; page: CommentsPage } | Failure

/** "Load more comments". Public data, so signed-out visitors are limited by IP. */
export async function loadCommentsAction(postId: unknown, cursor: unknown): Promise<LoadCommentsResult> {
  const parsedPost = postIdSchema.safeParse(postId)
  const parsedCursor = pageCursorSchema.safeParse(cursor ?? null)
  if (!parsedPost.success || !parsedCursor.success) {
    return { ok: false, error: "invalid", message: "Could not load more comments." }
  }

  const viewer = await getUser()
  const allowed = await withinRateLimits([
    { name: "comments:read", key: viewer?.id ?? (await clientIp()), limit: 120, windowSeconds: 10 * 60 },
  ])
  if (!allowed) return RATE_LIMITED

  try {
    const page = await listComments({ postId: parsedPost.data, cursor: parsedCursor.data, viewerId: viewer?.id ?? null })
    return { ok: true, page }
  } catch (error) {
    logFailure("loadComments", error)
    return { ok: false, error: "server", message: "Could not load more comments." }
  }
}

// ---------- Lists that need a signed-in viewer ----------

export type LoadActivityResult = { ok: true; page: ActivityPage } | Failure

export async function loadActivityAction(filter: unknown, cursor: unknown): Promise<LoadActivityResult> {
  const parsedFilter = activityFilterSchema.safeParse(filter)
  const parsedCursor = pageCursorSchema.safeParse(cursor ?? null)
  if (!parsedFilter.success || !parsedCursor.success) {
    return { ok: false, error: "invalid", message: "Could not load more activity." }
  }

  const session = await requireUserForAction()
  if (!session.ok) return UNAUTHORIZED("Sign in to see your activity.")

  const allowed = await withinRateLimits([
    { name: "activity:read", key: session.user.id, limit: 120, windowSeconds: 10 * 60 },
  ])
  if (!allowed) return RATE_LIMITED

  try {
    const page = await listNotifications({
      viewerId: session.user.id,
      filter: parsedFilter.data,
      cursor: parsedCursor.data,
    })
    return { ok: true, page }
  } catch (error) {
    logFailure("loadActivity", error)
    return { ok: false, error: "server", message: "Could not load more activity." }
  }
}

export type LoadBookmarksResult = { ok: true; page: FeedPage } | Failure

export async function loadBookmarksAction(cursor: unknown): Promise<LoadBookmarksResult> {
  const parsedCursor = pageCursorSchema.safeParse(cursor ?? null)
  if (!parsedCursor.success) return { ok: false, error: "invalid", message: "Could not load more posts." }

  const session = await requireUserForAction()
  if (!session.ok) return UNAUTHORIZED("Sign in to see your bookmarks.")

  const allowed = await withinRateLimits([
    { name: "bookmarks:read", key: session.user.id, limit: 120, windowSeconds: 10 * 60 },
  ])
  if (!allowed) return RATE_LIMITED

  try {
    const page = await listBookmarkedPosts({ viewerId: session.user.id, cursor: parsedCursor.data })
    return { ok: true, page }
  } catch (error) {
    logFailure("loadBookmarks", error)
    return { ok: false, error: "server", message: "Could not load more posts." }
  }
}
