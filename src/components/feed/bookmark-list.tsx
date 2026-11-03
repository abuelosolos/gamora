"use client"

import * as React from "react"
import Link from "next/link"
import { PostCard } from "@/components/feed/post-card"
import { BookmarkSimple } from "@/components/icons"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { loadBookmarksAction } from "@/server/actions/interactions"
import type { FeedPage, PostView } from "@/server/services/posts"

/** The viewer's saved posts: first page from the server, then more by cursor. */
function BookmarkList({ initial }: { initial: FeedPage }) {
  const [items, setItems] = React.useState<PostView[]>(initial.items)
  const [cursor, setCursor] = React.useState<string | null>(initial.nextCursor)
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState("")

  // A refresh (pull down) hands over a new first page: show it.
  const [seenInitial, setSeenInitial] = React.useState(initial)
  if (seenInitial !== initial) {
    setSeenInitial(initial)
    setItems(initial.items)
    setCursor(initial.nextCursor)
    setStatus("idle")
    setErrorMessage("")
  }

  async function loadMore() {
    if (!cursor || status === "loading") return
    setStatus("loading")
    const result = await loadBookmarksAction(cursor)
    if (result.ok) {
      setItems((current) => {
        const seen = new Set(current.map((post) => post.id))
        return [...current, ...result.page.items.filter((post) => !seen.has(post.id))]
      })
      setCursor(result.page.nextCursor)
      setStatus("idle")
    } else {
      setErrorMessage(result.message)
      setStatus("error")
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BookmarkSimple />}
        title="No bookmarks yet"
        description="Tap the bookmark on a post to save it here. Only you can see your bookmarks."
        action={
          <Button asChild>
            <Link href="/feed">Browse the feed</Link>
          </Button>
        }
      />
    )
  }

  return (
    <>
      <ul className="flex flex-col">
        {items.map((post) => (
          <li key={post.id}>
            <PostCard post={post} onDeleted={() => setItems((current) => current.filter((p) => p.id !== post.id))} />
          </li>
        ))}
      </ul>
      {status === "error" ? (
        <p role="alert" className="px-5 pt-4 text-center text-body-sm text-textSecondary">
          {errorMessage || "Could not load more posts."}
        </p>
      ) : null}
      {cursor ? (
        <div className="flex justify-center px-5 py-4">
          <Button variant="outline" size="sm" loading={status === "loading"} onClick={() => void loadMore()}>
            {status === "error" ? "Try again" : "Load more"}
          </Button>
        </div>
      ) : (
        <p className="px-5 py-6 text-center text-caption text-textSecondary">You are all caught up.</p>
      )}
    </>
  )
}

export { BookmarkList }
