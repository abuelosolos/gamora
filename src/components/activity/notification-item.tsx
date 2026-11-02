import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowsClockwise, ChatCircleFill, HeartFill, UserFill } from "@/components/icons"
import { Avatar } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelativeTime } from "@/lib/format-relative-time"
import type { NotificationView } from "@/server/services/interactions"

/**
 * Figma: Notifications (NotificationLike, NotificationReply). Avatar and a
 * round type icon on the first row, then the sentence (Body/Medium), the time
 * (Body small, textSecondary), a text preview and, for posts with art, a
 * 149x101 thumbnail. The whole card opens the post, or the profile for follows.
 *
 * Deviations:
 *  - The heart, comment, repost and share row under each card is left out.
 *    The card opens the post, where those actions live and are counted.
 *  - Icon colors come from status and accent tokens (like = statusError,
 *    reply = statusSuccess), not the raw colors in the design.
 *  - The "Martin paid $120" card is a hirer/wallet notification. Payments are
 *    not available, so that type does not exist here.
 */
const TYPES = {
  like: { text: "liked your post", icon: HeartFill, tone: "text-statusError" },
  comment: { text: "replied to your post", icon: ChatCircleFill, tone: "text-statusSuccess" },
  repost: { text: "reposted your post", icon: ArrowsClockwise, tone: "text-accentDefault" },
  follow: { text: "followed you", icon: UserFill, tone: "text-accentDefault" },
} as const

function NotificationItem({ notification }: { notification: NotificationView }) {
  const { actor, post, type } = notification
  const { text, icon: Icon, tone } = TYPES[type]
  const href = type === "follow" || !post ? `/u/${actor.username}` : `/post/${post.id}${type === "comment" ? "#comments" : ""}`
  const preview = type === "comment" ? notification.commentBody : post?.body

  return (
    <li className="border-b border-borderDefault">
      <Link
        href={href}
        className="flex flex-col gap-2 p-5 outline-none hover:bg-bgSurface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accentDefault"
      >
        <span className="flex items-center justify-between">
          <Avatar src={actor.avatarUrl} name={actor.name} size="md" />
          <span className="flex size-8.5 items-center justify-center rounded-full bg-bgSurface">
            <Icon aria-hidden="true" className={`size-5 ${tone}`} />
          </span>
        </span>
        <span className="flex flex-col">
          <span className="text-body font-medium text-textPrimary">
            {notification.unread ? <span className="sr-only">Unread. </span> : null}
            {actor.username} {text}
          </span>
          <time dateTime={notification.createdAt} suppressHydrationWarning className="text-body-sm text-textSecondary">
            {formatRelativeTime(notification.createdAt)}
          </time>
        </span>
        {preview ? (
          <span className="line-clamp-2 text-body-sm wrap-break-word text-textSecondary">{preview}</span>
        ) : null}
        {post?.imageUrl && type !== "comment" ? (
          <span className="relative block h-25.25 w-37.25 overflow-hidden rounded-ui-md border border-borderStrong bg-bgSurface">
            <Image src={post.imageUrl} alt="" fill sizes="150px" className="object-cover" />
          </span>
        ) : null}
      </Link>
    </li>
  )
}

function NotificationSkeleton() {
  return (
    <div className="flex flex-col gap-2 border-b border-borderDefault p-5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="size-8.5 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

export { NotificationItem, NotificationSkeleton }
