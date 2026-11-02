import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"
import { PostActions } from "@/components/feed/post-actions"
import { PostMenu } from "@/components/feed/post-menu"
import { Avatar } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPostDate } from "@/lib/format-post-date"
import { cn } from "@/lib/utils"
import type { PostView } from "@/server/services/posts"

/**
 * Figma: ContentDisplay 1 (one image) and ContentDisplay 2 (several images in
 * a row), from the Component 1 frame. Header with avatar, name, handle and
 * time; caption text; images; interaction row.
 *
 *   feed:   one image fills the width (about 246px tall); several scroll
 *           sideways as 150x196 tiles. Text and images open the post.
 *   detail: the post page. Larger text, images stacked at their own ratio.
 *
 * Deviations from the design:
 *  - The time is a date ("Nov 2"), not a clock time, because the server does
 *    not know the reader's time zone.
 *  - The interaction row is live (see PostActions). An active repost uses
 *    accentDefault because the icon set has no filled repost icon.
 *  - Drop shadow under the card is a 1px borderDefault line (no raw shadow values).
 */
const postCardVariants = cva("flex flex-col gap-0.5 border-b border-borderDefault bg-bgDefault px-5 py-2.5", {
  variants: { variant: { feed: "", detail: "border-b-0" } },
  defaultVariants: { variant: "feed" },
})

export interface PostCardProps
  extends Omit<React.ComponentProps<"article">, "children">,
    VariantProps<typeof postCardVariants> {
  post: PostView
  /** Feed list only: remove the card after the author deletes it. */
  onDeleted?: () => void
}

function PostImages({ post, variant }: { post: PostView; variant: "feed" | "detail" }) {
  const { images } = post
  if (images.length === 0) return null

  const alt = (image: PostView["images"][number]) => image.altText || `Image posted by ${post.author.name}`
  const tile = "relative overflow-hidden rounded-ui-md border border-borderStrong bg-bgSurface"

  if (variant === "detail") {
    return (
      <div className="flex flex-col gap-2.5 py-2.5">
        {images.map((image, index) => (
          <div key={image.id} className={tile}>
            <Image
              src={image.url}
              alt={alt(image)}
              width={image.width}
              height={image.height}
              sizes="(min-width: 768px) 390px, 100vw"
              priority={index === 0}
              className="h-auto w-full"
            />
          </div>
        ))}
      </div>
    )
  }

  const href = `/post/${post.id}`
  if (images.length === 1) {
    const image = images[0]!
    return (
      <Link href={href} className="block py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-accentDefault">
        <span className={cn(tile, "block h-61.5 w-full")}>
          <Image src={image.url} alt={alt(image)} fill sizes="(min-width: 768px) 390px, 100vw" className="object-cover" />
        </span>
      </Link>
    )
  }

  return (
    // Sideways scroll. tabIndex lets keyboard users scroll it; each tile is a link.
    <div
      role="group"
      aria-label={`${images.length} images`}
      tabIndex={0}
      className="-mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
    >
      {images.map((image) => (
        <Link key={image.id} href={href} className={cn(tile, "block h-49 w-37.5 shrink-0 snap-start")}>
          <Image src={image.url} alt={alt(image)} fill sizes="150px" className="object-cover" />
        </Link>
      ))}
    </div>
  )
}

function PostCard({ post, variant = "feed", onDeleted, className, ...props }: PostCardProps) {
  const resolved = variant ?? "feed"
  const { author } = post
  const href = `/post/${post.id}`

  return (
    <article
      data-slot="post-card"
      aria-label={`Post by ${author.name}`}
      className={cn(postCardVariants({ variant: resolved }), className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/u/${author.username}`}
          className="flex min-w-0 items-center gap-4 rounded-ui-sm outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
        >
          <Avatar src={author.avatarUrl} name={author.name} className="size-9" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-body font-medium text-textPrimary">{author.name}</span>
            <span className="truncate text-caption text-textSecondary">
              @{author.username} •{" "}
              <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
            </span>
          </span>
        </Link>
        <PostMenu
          postId={post.id}
          username={author.username}
          isOwner={post.isOwner}
          following={post.viewer.followsAuthor}
          onDeleted={onDeleted}
          redirectTo={resolved === "detail" ? "/feed" : undefined}
        />
      </div>

      {post.body ? (
        resolved === "feed" ? (
          <Link
            href={href}
            className="block rounded-ui-sm pt-2.5 text-caption wrap-break-word whitespace-pre-wrap text-textPrimary outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
          >
            {post.body}
          </Link>
        ) : (
          <p className="pt-2.5 text-body wrap-break-word whitespace-pre-wrap text-textPrimary">{post.body}</p>
        )
      ) : null}

      <PostImages post={post} variant={resolved} />
      <PostActions post={post} />
    </article>
  )
}

/** Loading placeholder with the same layout as a card. */
function PostCardSkeleton({ withImage = true }: { withImage?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-borderDefault px-5 py-2.5" aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <Skeleton className="h-3 w-3/4" />
      {withImage ? <Skeleton className="h-61.5 w-full rounded-ui-md" /> : null}
      <Skeleton className="h-5 w-full" />
    </div>
  )
}

export { PostCard, PostCardSkeleton, postCardVariants }
