import type { Metadata } from "next"

/**
 * What a link preview (Open Graph / X card) needs from a post, and how it is
 * turned into page metadata. Pure functions, no database, so they are easy to
 * check. Everything user-written goes in as plain text; Next escapes it.
 */
export interface PostPreview {
  body: string
  author: { name: string; username: string; avatarUrl: string | null }
  /** The post's first picture, if it has one. */
  image: { url: string; width: number; height: number; altText: string } | null
}

export const PREVIEW_DESCRIPTION_MAX = 160

/** Collapse whitespace and cut at a word boundary with an ellipsis. */
export function previewDescription(body: string, username: string): string {
  const text = body.replace(/\s+/g, " ").trim()
  if (!text) return `A post by @${username} on Gamora.`
  if (text.length <= PREVIEW_DESCRIPTION_MAX) return text
  const cut = text.slice(0, PREVIEW_DESCRIPTION_MAX - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > PREVIEW_DESCRIPTION_MAX / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export function postPreviewMetadata(preview: PostPreview, id: string): Metadata {
  const { author, image } = preview
  const title = `${author.name} (@${author.username}) on Gamora`
  const description = previewDescription(preview.body, author.username)
  const url = `/post/${id}`

  // The post's own picture, else the creator's avatar, else a text-only card.
  const picture = image
    ? { url: image.url, width: image.width, height: image.height, alt: image.altText || `Image posted by ${author.name}` }
    : author.avatarUrl
      ? { url: author.avatarUrl, width: 512, height: 512, alt: `${author.name}'s profile picture` }
      : null

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: "Gamora",
      title,
      description,
      url,
      ...(picture ? { images: [picture] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(picture ? { images: [{ url: picture.url, alt: picture.alt }] } : {}),
    },
  }
}
