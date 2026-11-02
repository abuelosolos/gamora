import "server-only"
import { del, list } from "@vercel/blob"
import { env } from "@/lib/env.server"

/**
 * Every file a user uploaded lives under their own folders:
 *   avatars/<userId>/  and  posts/<userId>/
 * (see storeAvatar and storeImage). The user id always comes from the session,
 * never from the request, so this can only reach the caller's own files.
 *
 * It lists by folder instead of using the database rows, so files that no row
 * points at any more (an old avatar, an upload that was never posted) go too.
 * Returns how many files could not be removed; the caller logs it, because by
 * then the account is already gone and there is nothing left to retry from.
 */
export async function deleteAllUserFiles(userId: string): Promise<{ failed: number }> {
  let failed = 0
  for (const prefix of [`avatars/${userId}/`, `posts/${userId}/`]) {
    let cursor: string | undefined
    do {
      try {
        const page = await list({ prefix, cursor, limit: 500, token: env.BLOB_READ_WRITE_TOKEN })
        if (page.blobs.length > 0) {
          await del(
            page.blobs.map((blob) => blob.url),
            { token: env.BLOB_READ_WRITE_TOKEN },
          )
        }
        cursor = page.hasMore ? page.cursor : undefined
      } catch (error) {
        failed += 1
        console.error("[user-files] cleanup failed", error instanceof Error ? error.message : "unknown")
        break
      }
    } while (cursor)
  }
  return { failed }
}
