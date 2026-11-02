"use client"

import * as React from "react"
import Link from "next/link"
import { PostCard, PostCardSkeleton } from "@/components/feed/post-card"
import { Plus } from "@/components/icons"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { loadFeedPageAction, loadProfilePostsAction } from "@/server/actions/posts"
import type { FeedPage, PostView } from "@/server/services/posts"
import type { FeedTab } from "@/server/validators/posts"

/** Where the posts come from: a feed tab, or one artist's profile. */
export type FeedSource = { kind: "feed"; tab: FeedTab } | { kind: "profile"; username: string; isOwner: boolean }

export interface FeedListProps {
  source: FeedSource
  initial: FeedPage
}

/**
 * The posts of one feed tab or one profile. The first page comes from the server; the next
 * pages load by cursor when the end of the list scrolls into view, or when the
 * reader presses the button after an error.
 */
function FeedList({ source, initial }: FeedListProps) {
  const [items, setItems] = React.useState<PostView[]>(initial.items)
  const [cursor, setCursor] = React.useState<string | null>(initial.nextCursor)
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState("")
  const sentinel = React.useRef<HTMLDivElement>(null)
  const busy = React.useRef(false)

  const loadMore = React.useCallback(async () => {
    if (busy.current || !cursor) return
    busy.current = true
    setStatus("loading")
    const result =
      source.kind === "feed"
        ? await loadFeedPageAction(source.tab, cursor)
        : await loadProfilePostsAction(source.username, cursor)
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
    busy.current = false
  }, [cursor, source])

  React.useEffect(() => {
    const node = sentinel.current
    if (!node || !cursor || status !== "idle") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: "400px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [cursor, status, loadMore])

  if (items.length === 0) {
    if (source.kind === "profile") {
      return source.isOwner ? (
        <EmptyState
          title="You have not posted yet"
          description="Share your first piece and it will show up here."
          action={
            <Button asChild>
              <Link href="/create">
                <Plus aria-hidden="true" />
                Create post
              </Link>
            </Button>
          }
        />
      ) : (
        <EmptyState title="No posts yet" description="When this artist posts, you will see it here." />
      )
    }
    return source.tab === "following" ? (
      <EmptyState
        title="Nothing from people you follow yet"
        description="Posts from artists you follow will show up here."
      />
    ) : (
      <EmptyState
        title="No posts yet"
        description="Be the first to share what you have been working on."
        action={
          <Button asChild>
            <Link href="/create">
              <Plus aria-hidden="true" />
              Create post
            </Link>
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

      {cursor ? <div ref={sentinel} aria-hidden="true" className="h-px" /> : null}

      {status === "loading" ? (
        <div role="status" aria-label="Loading more posts">
          <PostCardSkeleton />
        </div>
      ) : null}

      {status === "error" ? (
        <div role="alert" className="flex flex-col items-center gap-3 px-5 py-6 text-center">
          <p className="text-body-sm text-textSecondary">{errorMessage || "Could not load more posts."}</p>
          <Button variant="outline" onClick={() => void loadMore()}>
            Try again
          </Button>
        </div>
      ) : null}

      {!cursor ? (
        <p className="px-5 py-6 text-center text-caption text-textSecondary">You are all caught up.</p>
      ) : null}
    </>
  )
}

export { FeedList }
