"use client"

import * as React from "react"
import { checkNewPostsAction } from "@/server/actions/posts"
import type { NewerFeedPosts } from "@/server/services/posts"
import type { FeedTab } from "@/server/validators/posts"

const POLL_MS = 45_000

/**
 * Asks the server now and then whether anyone has posted since the post at the
 * top of the list. The baseline is that top post, so a refresh (which changes
 * it) clears the answer. Runs only while the tab is visible.
 */
export function useNewPosts({
  enabled,
  tab,
  genres,
  topPostId,
}: {
  enabled: boolean
  tab: FeedTab
  genres: string[] | undefined
  topPostId: string | null
}): NewerFeedPosts | null {
  const [found, setFound] = React.useState<{ topPostId: string | null; value: NewerFeedPosts } | null>(null)
  const genreKey = (genres ?? []).join(",")

  React.useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function check() {
      if (document.hidden) return
      const result = await checkNewPostsAction(tab, genreKey ? genreKey.split(",") : [], topPostId)
      if (cancelled || !result.ok) return
      setFound({ topPostId, value: result.found })
    }

    const timer = setInterval(() => void check(), POLL_MS)
    const onVisible = () => {
      if (!document.hidden) void check()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [enabled, tab, genreKey, topPostId])

  // An answer about an older top post is stale once the list has changed.
  return found && found.topPostId === topPostId && found.value.count > 0 ? found.value : null
}
