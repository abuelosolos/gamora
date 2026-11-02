import "server-only"

/**
 * A post image URL is only accepted if it is a Blob URL under the caller's own
 * folder (posts/<userId>/). That is what /api/upload produces, so a client
 * cannot attach someone else's file or an arbitrary URL to a post.
 */
export function isOwnPostImageUrl(value: unknown, userId: string): value is string {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.startsWith(`/posts/${userId}/`) &&
      url.pathname.endsWith(".webp")
    )
  } catch {
    return false
  }
}
