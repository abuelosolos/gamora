"use client"

import * as React from "react"
import { useOptimisticFlag } from "@/components/feed/use-optimistic-flag"
import { setBookmarkAction, setLikeAction, setRepostAction } from "@/server/actions/interactions"
import type { PostView } from "@/server/services/posts"

/**
 * Holds the optimistic like, repost and bookmark state of ONE post, so the
 * action row on the card and the one in the full-screen image viewer (which
 * lives in a portal outside the card) always show the same numbers. Each flag
 * behaves as before (see useOptimisticFlag): flips at once, rolls back on error.
 */
type Flag = ReturnType<typeof useOptimisticFlag>
interface PostInteractions {
  like: Flag
  repost: Flag
  bookmark: Flag
}

const PostInteractionsContext = React.createContext<PostInteractions | null>(null)

function PostInteractionsProvider({ post, children }: { post: PostView; children: React.ReactNode }) {
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

  return <PostInteractionsContext.Provider value={{ like, repost, bookmark }}>{children}</PostInteractionsContext.Provider>
}

function usePostInteractions(): PostInteractions {
  const value = React.useContext(PostInteractionsContext)
  if (!value) throw new Error("usePostInteractions must be used inside PostInteractionsProvider")
  return value
}

export { PostInteractionsProvider, usePostInteractions }
