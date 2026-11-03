"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowsClockwise,
  BookmarkSimple,
  BookmarkSimpleFill,
  ChatCircle,
  Heart,
  HeartFill,
  ShareNetwork,
} from "@/components/icons"
import { usePostInteractions } from "@/components/feed/post-interactions"
import { ShareSheet } from "@/components/shared/share-sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PostView } from "@/server/services/posts"

/**
 * Figma: ContentInteractCont. Heart, comment and repost on the left; bookmark
 * and share on the right. Counts sit next to the icon in the caption style.
 *
 * Likes, bookmarks and reposts are optimistic and roll back on failure (see
 * useOptimisticFlag); their state comes from PostInteractionsProvider so the
 * card and the image viewer stay in step. Reply opens the post page at the
 * replies (`onReply` lets the image viewer close itself first). Share copies
 * the link to the post.
 *
 * Deviation from the design: there is no filled repost icon in the icon set,
 * so an active repost is shown in accentDefault instead.
 */
const item = "gap-1 px-2.5 text-caption text-textSecondary [&_svg:not([class*='size-'])]:size-5"

function Count({ value }: { value: number }) {
  // Hidden at zero so empty posts stay quiet; the label still announces it.
  return value > 0 ? <span aria-hidden="true">{value}</span> : null
}

function PostActions({ post, onReply }: { post: PostView; onReply?: () => void }) {
  const { like, repost, bookmark } = usePostInteractions()

  return (
    <div className="-mx-2.5 flex items-center justify-between" role="group" aria-label="Post actions">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={like.on}
          aria-busy={like.pending}
          aria-label={`Like, ${like.count} ${like.count === 1 ? "like" : "likes"}`}
          className={cn(item, like.on && "text-statusError")}
          onClick={() => void like.toggle()}
        >
          {like.on ? <HeartFill aria-hidden="true" /> : <Heart aria-hidden="true" />}
          <Count value={like.count} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className={item}
        >
          <Link
            href={`/post/${post.id}#replies`}
            onClick={onReply}
            aria-label={`Replies, ${post.replyCount} ${post.replyCount === 1 ? "reply" : "replies"}`}
          >
            <ChatCircle aria-hidden="true" />
            <Count value={post.replyCount} />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={repost.on}
          aria-busy={repost.pending}
          aria-label={`Repost, ${repost.count} ${repost.count === 1 ? "repost" : "reposts"}`}
          className={cn(item, repost.on && "text-accentDefault")}
          onClick={() => void repost.toggle()}
        >
          <ArrowsClockwise aria-hidden="true" />
          <Count value={repost.count} />
        </Button>
      </div>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={bookmark.on}
          aria-busy={bookmark.pending}
          aria-label={bookmark.on ? "Remove bookmark" : "Bookmark"}
          className={cn(item, bookmark.on && "text-accentDefault")}
          onClick={() => void bookmark.toggle()}
        >
          {bookmark.on ? <BookmarkSimpleFill aria-hidden="true" /> : <BookmarkSimple aria-hidden="true" />}
        </Button>
        <ShareSheet path={`/post/${post.id}`} title={`Post by ${post.author.name}`}>
          <Button variant="ghost" size="sm" aria-label="Share post" className={item}>
            <ShareNetwork aria-hidden="true" />
          </Button>
        </ShareSheet>
      </div>
    </div>
  )
}

export { PostActions }
