import { z } from "zod"

export const POST_BODY_MAX = 2000
export const POST_MAX_IMAGES = 4
export const FEED_PAGE_SIZE = 20

/** Same rule as the database check constraint `posts_body_length`. */
const body = z.string().trim().max(POST_BODY_MAX, `Use ${POST_BODY_MAX} characters or fewer.`)

const postImageInput = z.strictObject({
  url: z.url().max(500),
  // Stored images are at most 2000 px (see process-image.ts).
  width: z.number().int().min(1).max(2000),
  height: z.number().int().min(1).max(2000),
  altText: z.string().trim().max(500).default(""),
})

export const createPostSchema = z
  .strictObject({
    body,
    images: z.array(postImageInput).max(POST_MAX_IMAGES, `Add up to ${POST_MAX_IMAGES} images.`),
  })
  .refine((value) => value.body.length > 0 || value.images.length > 0, {
    message: "Write something or add an image.",
    path: ["body"],
  })

export type CreatePostInput = z.input<typeof createPostSchema>

export const postIdSchema = z.uuid()

export const feedTabSchema = z.enum(["for-you", "following"])
export type FeedTab = z.infer<typeof feedTabSchema>

/**
 * Opaque cursor: base64url of "<created_at as text>|<id>". The timestamp stays
 * a string so microsecond precision survives (a JS Date would cut it to ms and
 * rows could be skipped or repeated at page borders).
 */
export const feedCursorSchema = z
  .string()
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/)
  .nullable()
