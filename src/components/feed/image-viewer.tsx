"use client"

import * as React from "react"
import Image from "next/image"
import { Dialog as DialogPrimitive } from "radix-ui"
import { PostActions } from "@/components/feed/post-actions"
import { PostMenu } from "@/components/feed/post-menu"
import { usePanZoom } from "@/components/feed/use-pan-zoom"
import { CaretLeft, CaretRight } from "@/components/icons"
import { TopBarButton } from "@/components/layout/top-bar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { PostView } from "@/server/services/posts"

/**
 * Full-screen image viewer, opened by pressing a post image. No Figma frame
 * exists for it, so it is composed from the app's own parts: a bar with Back
 * and the post's three-dot menu (PostMenu), the zoomable picture, and the same
 * action row as the card (PostActions) underneath. The background is bgDefault,
 * so it follows the five themes.
 *
 * It is a Radix dialog (focus stays inside, Escape closes, focus returns to the
 * image that was pressed). Several images: swipe, arrow keys, or the side
 * buttons on wide screens move between them; zoom resets for each picture.
 * Reply closes the viewer and goes to the replies on the post page.
 */
export interface ImageViewerProps {
  post: PostView
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  /** Called after the author deletes the post from the viewer's menu. */
  onDeleted?: () => void
  redirectTo?: string
  noun?: "post" | "reply"
}

function ImageViewer({ post, index, onIndexChange, onClose, onDeleted, redirectTo, noun = "post" }: ImageViewerProps) {
  const { images, author } = post
  const count = images.length
  const image = images[index]
  if (!image) return null

  function go(direction: 1 | -1) {
    const next = index + direction
    if (next >= 0 && next < count) onIndexChange(next)
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          data-slot="image-viewer"
          className="fixed inset-0 z-50 flex flex-col bg-bgDefault text-textPrimary outline-none duration-200 data-open:animate-in data-open:fade-in-0 motion-reduce:animate-none"
        >
          <DialogPrimitive.Title className="sr-only">
            {count > 1 ? `Image ${index + 1} of ${count}` : "Image"} by {author.name}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Pinch, scroll or double-tap to zoom. Press Escape to close.
          </DialogPrimitive.Description>

          <header className="mx-auto flex min-h-12.5 w-full max-w-lg shrink-0 items-center justify-between px-5 py-1">
            <DialogPrimitive.Close asChild>
              <TopBarButton label="Back" className="-ml-2.5">
                <CaretLeft aria-hidden="true" className="size-6" />
              </TopBarButton>
            </DialogPrimitive.Close>
            <PostMenu
              postId={post.id}
              username={author.username}
              isOwner={post.isOwner}
              following={post.viewer.followsAuthor}
              onDeleted={() => {
                onClose()
                onDeleted?.()
              }}
              redirectTo={redirectTo}
              noun={noun}
            />
          </header>

          <ZoomStage
            key={image.id}
            image={image}
            alt={image.altText || `Image posted by ${author.name}`}
            hasPrevious={index > 0}
            hasNext={index < count - 1}
            onStep={go}
          />

          <footer className="mx-auto flex w-full max-w-lg shrink-0 flex-col gap-1 px-5 pt-2 pb-6">
            {count > 1 ? (
              <p aria-live="polite" className="text-center text-caption text-textSecondary">
                {index + 1} / {count}
              </p>
            ) : null}
            <PostActions post={post} onReply={onClose} />
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ZoomStage({
  image,
  alt,
  hasPrevious,
  hasNext,
  onStep,
}: {
  image: PostView["images"][number]
  alt: string
  hasPrevious: boolean
  hasNext: boolean
  onStep: (direction: 1 | -1) => void
}) {
  const { ref, style, handlers } = usePanZoom({ image, onSwipe: onStep })
  const [status, setStatus] = React.useState<"loading" | "loaded" | "error">("loading")

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} {...handlers} className="absolute inset-0 touch-none overflow-hidden select-none">
        {status === "error" ? (
          <p role="alert" className="absolute inset-0 flex items-center justify-center px-5 text-center text-body-sm text-textSecondary">
            This image could not be loaded.
          </p>
        ) : (
          <div className="absolute inset-0" style={style}>
            <Image
              src={image.url}
              alt={alt}
              fill
              priority
              draggable={false}
              sizes="100vw"
              onLoad={() => setStatus("loaded")}
              onError={() => setStatus("error")}
              className={cn("object-contain transition-opacity duration-200 motion-reduce:transition-none", status === "loaded" ? "opacity-100" : "opacity-0")}
            />
          </div>
        )}
        {status === "loading" ? <Skeleton className="absolute inset-5 rounded-ui-md" /> : null}
      </div>
      {hasPrevious ? (
        <Button variant="secondary" size="icon" aria-label="Previous image" onClick={() => onStep(-1)} className="absolute top-1/2 left-3 hidden -translate-y-1/2 md:inline-flex">
          <CaretLeft aria-hidden="true" />
        </Button>
      ) : null}
      {hasNext ? (
        <Button variant="secondary" size="icon" aria-label="Next image" onClick={() => onStep(1)} className="absolute top-1/2 right-3 hidden -translate-y-1/2 md:inline-flex">
          <CaretRight aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}

export { ImageViewer }
