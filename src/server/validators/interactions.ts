import { z } from "zod"

export const COMMENT_BODY_MAX = 1000
export const COMMENTS_PAGE_SIZE = 20
export const ACTIVITY_PAGE_SIZE = 20

/** Same rule as the database check constraint `comments_body_length` (1 to 1000). */
export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Write a comment first.")
  .max(COMMENT_BODY_MAX, `Use ${COMMENT_BODY_MAX} characters or fewer.`)

export const createCommentSchema = z.strictObject({
  postId: z.uuid(),
  body: commentBodySchema,
})

export const commentIdSchema = z.uuid()

/** "on" is the state the caller wants, not a flip, so repeating a request changes nothing. */
export const setPostFlagSchema = z.strictObject({
  postId: z.uuid(),
  on: z.boolean(),
})

/** Follows are addressed by the public username, so no user id reaches the client. */
export const setFollowSchema = z.strictObject({
  username: z.string().regex(/^[a-z0-9_]{3,20}$/),
  on: z.boolean(),
})

/** Opaque cursor, same shape rules as the feed cursor. */
export const pageCursorSchema = z
  .string()
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/)
  .nullable()

/** Pills on the Activity screen. "mentions" has no data yet, so it is not a filter. */
export const activityFilterSchema = z.enum(["all", "likes", "replies"])
export type ActivityFilter = z.infer<typeof activityFilterSchema>
