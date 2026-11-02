import { z } from "zod"

export const REPLY_BODY_MAX = 1000
export const REPLIES_PAGE_SIZE = 20
export const ACTIVITY_PAGE_SIZE = 20

/** Replies are posts: at least 1 and at most 1000 characters here (the database allows 2000). */
export const replyBodySchema = z
  .string()
  .trim()
  .min(1, "Write a reply first.")
  .max(REPLY_BODY_MAX, `Use ${REPLY_BODY_MAX} characters or fewer.`)

export const createReplySchema = z.strictObject({
  postId: z.uuid(),
  body: replyBodySchema,
})

export const replyIdSchema = z.uuid()

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
