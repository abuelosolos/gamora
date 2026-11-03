import { z } from "zod"

export const UNBLOCK_MAX = 50

/** Blocking is addressed by the public username, so no user id reaches the client. */
export const blockUserSchema = z.strictObject({
  username: z.string().regex(/^[a-z0-9_]{3,20}$/),
})

/** Unblock takes the usernames shown in the list. */
export const unblockUsersSchema = z.strictObject({
  usernames: z
    .array(z.string().regex(/^[a-z0-9_]{3,20}$/))
    .min(1)
    .max(UNBLOCK_MAX),
})
