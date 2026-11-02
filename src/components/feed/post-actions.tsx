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
import { useOptimisticFlag } from "@/components/feed/use-optimistic-flag"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { setBookmarkAction, setLikeAction, setRepostAction } from "@/server/actions/interactions"
import type { PostView } from "@/server/services/posts"

/**
 * Figma: ContentInteractCont. Heart, comment and repost on the left; bookmark
 * and share on the right. Counts sit next to the icon in the caption style.
 *
 * Likes, bookmarks and reposts are optimistic and roll back on failure (see
 * useOptimisticFlag). Reply opens the post page at the replies. Share
 * copies the link to the post.
 *
 * Deviation from the design: there is no filled repost icon in the icon set,
 * so an active repost is shown in accentDefault instead.
 */
const item = "gap-1 px-2.5 text-caption text-textSecondary [&_svg:not([class*='size-'])]:size-5"

function Count({ value }: { value: number }) {
  // Hidden at zero so empty posts stay quiet; the label still announces it.
  return value > 0 ? <span aria-hidden="true">{value}</span> : null
}

function PostActions({ post }: { post: PostView }) {
  const { toast } = useToast()

  const like = useOptimisticFlag({ on: post.viewer.liked, count: post.likeCount }, async (on) => {
    const result = await setLikeAction({ postId: post.id, on })
    return result.ok ? { ok: true, on: result.on, count: result.likeCount } : result
  })
  const repost = useOptimisticFlag({ on: post.viewer.reposted, count: post.repostCount }, async (on) => {
    const result = await setRepostAction({ postId: post.id, on })
    return result.ok ? { ok: true, on: result.on, count: result.repostCount } : result
  })
  const bookmark = useOptimisticFlag({ on: post.viewer.bookmarked, count: 0 }, async (on) => {
    const result = await setBookmarkAction({ postId: post.id, on })
    return result.ok ? { ok: true, on: result.on, count: 0 } : result
  })

  async function copyLink() {
    const url = `${window.location.origin}/post/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast({ variant: "success", title: "Link copied" })
    } catch {
      toast({ variant: "error", title: "Could not copy the link" })
    }
  }

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
        <Button variant="ghost" size="sm" aria-label="Copy link to post" className={item} onClick={() => void copyLink()}>
          <ShareNetwork aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

export { PostActions }
