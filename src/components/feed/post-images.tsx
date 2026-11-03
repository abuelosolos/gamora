"use client"

import * as React from "react"
import Image from "next/image"
import { ImageViewer } from "@/components/feed/image-viewer"
import { cn } from "@/lib/utils"
import type { PostView } from "@/server/services/posts"

/**
 * The pictures of a post. Figma: ContentDisplay 1 (one image) and
 * ContentDisplay 2 (several images in a row).
 *
 *   feed:   one image fills the width and keeps its own shape, limited to
 *           FEED_IMAGE_MIN_RATIO..FEED_IMAGE_MAX_RATIO (width / height); several
 *           scroll sideways as 150x196 tiles.
 *   detail: the post page. One image at its own ratio, full width; several
 *           flow sideways (swipe or scroll right), each at its own shape, with
 *           the next one peeking in.
 *
 * Pressing any picture opens it full screen in the ImageViewer (zoom, menu and
 * actions). Pictures are buttons, not links; the text, avatar and header still
 * open the post or profile.
 */
const FEED_IMAGE_MAX_RATIO = 1.4
const FEED_IMAGE_MIN_RATIO = 0.7

function feedImageRatio(width: number, height: number): number {
  const ratio = width / height
  if (!Number.isFinite(ratio) || ratio <= 0) return FEED_IMAGE_MAX_RATIO
  return Math.min(FEED_IMAGE_MAX_RATIO, Math.max(FEED_IMAGE_MIN_RATIO, ratio))
}

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
const tile = "relative overflow-hidden rounded-ui-md border border-borderStrong bg-bgSurface"

export interface PostImagesProps {
  post: PostView
  variant: "feed" | "detail"
  onDeleted?: () => void
  redirectTo?: string
  noun?: "post" | "reply"
}

function PostImages({ post, variant, onDeleted, redirectTo, noun }: PostImagesProps) {
  const { images } = post
  const [viewing, setViewing] = React.useState<number | null>(null)
  if (images.length === 0) return null

  const alt = (image: PostView["images"][number]) => image.altText || `Image posted by ${post.author.name}`
  const open = (index: number) => () => setViewing(index)

  let content: React.ReactNode
  if (variant === "detail" && images.length > 1) {
    content = (
      // Sideways scroll, never stacked downward. tabIndex lets keyboard users scroll it.
      <div
        role="group"
        aria-label={`${images.length} images`}
        tabIndex={0}
        className={cn("-mx-5 flex snap-x snap-mandatory items-start gap-2.5 overflow-x-auto px-5 py-2.5 scroll-px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", focusRing)}
      >
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            aria-haspopup="dialog"
            onClick={open(index)}
            className={cn(tile, "block w-4/5 shrink-0 snap-start", focusRing)}
            style={{ aspectRatio: feedImageRatio(image.width, image.height) }}
          >
            <Image
              src={image.url}
              alt={alt(image)}
              fill
              sizes="(min-width: 768px) 312px, 80vw"
              priority={index === 0}
              className="object-cover"
            />
          </button>
        ))}
      </div>
    )
  } else if (variant === "detail") {
    content = (
      <div className="flex flex-col gap-2.5 py-2.5">
        {images.map((image, index) => (
          <button key={image.id} type="button" aria-haspopup="dialog" onClick={open(index)} className={cn(tile, "block", focusRing)}>
            <Image
              src={image.url}
              alt={alt(image)}
              width={image.width}
              height={image.height}
              sizes="(min-width: 768px) 390px, 100vw"
              priority={index === 0}
              className="h-auto w-full"
            />
          </button>
        ))}
      </div>
    )
  } else if (images.length === 1) {
    const image = images[0]!
    content = (
      <div className="py-2.5">
        {/* The box is sized from the stored width and height, so it keeps its height while the picture loads. */}
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={open(0)}
          className={cn(tile, "block w-full", focusRing)}
          style={{ aspectRatio: feedImageRatio(image.width, image.height) }}
        >
          <Image src={image.url} alt={alt(image)} fill sizes="(min-width: 768px) 390px, 100vw" className="object-cover" />
        </button>
      </div>
    )
  } else {
    content = (
      // Sideways scroll. tabIndex lets keyboard users scroll it; each tile is a button.
      <div
        role="group"
        aria-label={`${images.length} images`}
        tabIndex={0}
        className={cn("-mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", focusRing)}
      >
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            aria-haspopup="dialog"
            onClick={open(index)}
            className={cn(tile, "block h-49 w-37.5 shrink-0 snap-start", focusRing)}
          >
            <Image src={image.url} alt={alt(image)} fill sizes="150px" className="object-cover" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      {content}
      {viewing !== null ? (
        <ImageViewer
          post={post}
          index={viewing}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
          onDeleted={onDeleted}
          redirectTo={redirectTo}
          noun={noun}
        />
      ) : null}
    </>
  )
}

export { PostImages }
