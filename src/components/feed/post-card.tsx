import * as React from "react"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"
import { PostActions } from "@/components/feed/post-actions"
import { PostImages } from "@/components/feed/post-images"
import { PostInteractionsProvider } from "@/components/feed/post-interactions"
import { PostTime } from "@/components/feed/post-time"
import { PostMenu } from "@/components/feed/post-menu"
import { ArrowsClockwise, ChatCircle, Heart, PencilSimpleLine } from "@/components/icons"
import { Avatar } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { PostView } from "@/server/services/posts"

/**
 * Figma: ContentDisplay 1 (one image) and ContentDisplay 2 (several images in
 * a row), from the Component 1 frame. Header with avatar, name, handle and
 * time; caption text; images; interaction row.
 *
 *   feed:   images are shown by PostImages (one image keeps its own shape,
 *           several scroll sideways) and open the full-screen ImageViewer.
 *           Text opens the post.
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
  /** True for a reply: only changes the wording of the report sheet. */
  isReply?: boolean
  /** Inside a ReplyThread: the avatar moves to a left rail. "parent" also draws the line down to the reply. */
  thread?: "parent" | "reply"
}

function PostCard({ post, variant = "feed", onDeleted, isReply, thread, className, ...props }: PostCardProps) {
  const resolved = variant ?? "feed"

  // A reply in a profile list is shown under the post it answers (Figma "Profile(Replies)").
  if (!thread && post.via?.kind === "reply" && post.via.parent) {
    return <ReplyThread reply={post} parent={post.via.parent} onDeleted={onDeleted} className={className} />
  }

  const { author } = post
  const href = `/post/${post.id}`
  const threaded = thread !== undefined

  const profileLink = (
    <Link
      href={`/u/${author.username}`}
      aria-label={threaded ? `${author.name}, @${author.username}` : undefined}
      className="flex min-w-0 items-center gap-4 rounded-ui-sm outline-none focus-visible:ring-2 focus-visible:ring-accentDefault"
    >
      {threaded ? null : <Avatar src={author.avatarUrl} name={author.name} className="size-9" />}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-body font-medium text-textPrimary">{author.name}</span>
        <span className="truncate text-caption text-textSecondary">
          @{author.username} • <PostTime iso={post.createdAt} />
        </span>
      </span>
    </Link>
  )

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        {profileLink}
        <PostMenu
          postId={post.id}
          username={author.username}
          isOwner={post.isOwner}
          following={post.viewer.followsAuthor}
          onDeleted={onDeleted}
          noun={isReply || thread === "reply" ? "reply" : "post"}
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

      <PostImages
        post={post}
        variant={resolved}
        onDeleted={onDeleted}
        redirectTo={resolved === "detail" ? "/feed" : undefined}
        noun={isReply || thread === "reply" ? "reply" : "post"}
      />
      <PostActions post={post} />
    </>
  )

  return (
    <PostInteractionsProvider post={post}>
      <article
        data-slot="post-card"
        aria-label={`${thread === "reply" ? "Reply" : "Post"} by ${author.name}`}
        className={cn(postCardVariants({ variant: resolved }), threaded && "flex-row gap-2.5", className)}
        {...props}
      >
        {post.via ? <PostVia via={post.via} /> : null}
        {threaded ? (
          <>
            {/* Left rail: avatar, and for the parent a line down to the reply's avatar. */}
            <div className="flex w-9.5 shrink-0 flex-col items-center">
              <Link
                href={`/u/${author.username}`}
                aria-hidden="true"
                tabIndex={-1}
                className="rounded-full outline-none"
              >
                <Avatar src={author.avatarUrl} name={author.name} className="size-9.5" />
              </Link>
              {thread === "parent" ? <span aria-hidden="true" className="w-0.5 flex-1 rounded-full bg-borderStrong" /> : null}
            </div>
            <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", thread === "parent" && "pb-10")}>{content}</div>
          </>
        ) : (
          content
        )}
      </article>
    </PostInteractionsProvider>
  )
}

/**
 * Figma "Profile(Replies)": the post that was answered, then the reply, joined
 * by a line between the two avatars. When the answered post is itself a reply
 * (commenting under a comment) it looks the same. One border under the thread.
 */
function ReplyThread({
  reply,
  parent,
  onDeleted,
  className,
}: {
  reply: PostView
  parent: PostView
  onDeleted?: () => void
  className?: string
}) {
  return (
    <div data-slot="reply-thread" className={cn("border-b border-borderDefault bg-bgDefault", className)}>
      <PostCard post={parent} thread="parent" className="border-b-0 pb-0" />
      <PostCard
        post={{ ...reply, via: undefined }}
        thread="reply"
        onDeleted={onDeleted}
        className="border-b-0 pt-0"
      />
    </div>
  )
}

const VIA_LABEL = { post: "Posted", reply: "Replied", repost: "Reposted", like: "Liked" } as const
const VIA_ICON = { post: PencilSimpleLine, reply: ChatCircle, repost: ArrowsClockwise, like: Heart } as const

/** Profile lists: what the profile's owner did with this post, and when (live age, then the date). */
function PostVia({ via }: { via: NonNullable<PostView["via"]> }) {
  const Icon = VIA_ICON[via.kind]
  return (
    <p className="flex items-center gap-1.5 pb-1 text-caption text-textSecondary">
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">
        {VIA_LABEL[via.kind]} •{" "}
        <PostTime iso={via.at} />
      </span>
    </p>
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
