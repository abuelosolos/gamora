import "server-only"

/**
 * An avatar URL is only accepted if it is a Blob URL under the caller's own
 * folder (avatars/<userId>/). Used by onboarding and edit profile, so a client
 * cannot point a profile at someone else's file or an arbitrary URL.
 */
export function isOwnAvatarUrl(value: unknown, userId: string): value is string {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.startsWith(`/avatars/${userId}/`)
    )
  } catch {
    return false
  }
}

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
